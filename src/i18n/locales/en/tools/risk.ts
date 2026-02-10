/**
 * Risk management tools
 */

export const enRiskTools = {
	getValueAtRisk: {
			name: 'Get Value at Risk',
			description: 'Calculate portfolio Value at Risk (VaR) metrics.'
		},
getStressTestingResults: {
			name: 'Get Stress Testing Results',
			description: 'Get portfolio stress testing scenario results.'
		},
getScenarioAnalysis: {
			name: 'Get Scenario Analysis',
			description: 'Perform portfolio analysis under various market scenarios.'
		},
getPortfolioRiskAttribution: {
			name: 'Get Portfolio Risk Attribution',
			description: 'Decompose portfolio risk sources and contributions.'
		},
		getCreditRiskMetrics: {
			name: 'Get Credit Risk Metrics',
			description: 'Get credit risk exposure and default risk indicators.'
		},
		getLiquidityRiskIndicators: {
			name: 'Get Liquidity Risk Indicators',
			description: 'Assess portfolio liquidity risk.'
		},
		getOperationalRiskIndicators: {
			name: 'Get Operational Risk Indicators',
			description: 'Monitor operational risk events and indicators.'
		},
		getMarginRequirements: {
			name: 'Get Margin Requirements',
			description: 'Calculate margin requirements for derivatives and financing trades.'
		},
		getCounterpartyExposure: {
			name: 'Get Counterparty Exposure',
			description: 'Monitor credit risk exposure to counterparties.'
		},
		getConcentrationRiskAnalysis: {
			name: 'Get Concentration Risk Analysis',
			description: 'Analyze portfolio concentration risk.'
		},
		getTailRiskIndicators: {
			name: 'Get Tail Risk Indicators',
			description: 'Monitor extreme risk and tail event probabilities.'
		},
		getRiskLimitMonitoring: {
			name: 'Get Risk Limit Monitoring',
			description: 'Monitor whether portfolio exceeds risk limits.'
		},
		getStockHotRankEM: {
			name: 'Get Stock Popularity Ranking',
			description: 'Get stock popularity ranking from East Money.'
		},
		getStockHotUpEM: {
			name: 'Get Hot Rising Stocks',
			description: 'Get list of stocks with rapidly rising popularity.'
		},
		getStockHotKeywordEM: {
			name: 'Get Hot Stock Keywords',
			description: 'Get hot search keywords in stock market.'
		},
		getStockCYQEM: {
			name: 'Get Stock Cost Distribution',
			description: 'Get stock chip distribution and cost distribution data.'
		},
		getStockIntradayEM: {
			name: 'Get Stock Intraday Data - East Money',
			description: 'Get real-time stock market data from East Money.'
		},
		getStockIntradaySina: {
			name: 'Get Stock Intraday Data - Sina',
			description: 'Get real-time stock market data from Sina Finance.'
		},
		getStockBidAskEM: {
			name: 'Get Stock Bid/Ask Data',
			description: 'Get 5-level bid/ask order book data.'
		},
		getStockChangesEM: {
			name: 'Get Stock Changes Statistics',
			description: 'Get market advancing/declining stock count statistics.'
		},
		getStockBoardChangeEM: {
			name: 'Get Sector Changes Statistics',
			description: 'Get industry and concept sector performance statistics.'
		},
		getStockHotFollowXQ: {
			name: 'Get Xueqiu Follow Ranking',
			description: 'Get stock following ranking from Xueqiu platform.'
		},
		getStockHotTweetXQ: {
			name: 'Get Xueqiu Discussion Heat',
			description: 'Get stock discussion heat ranking from Xueqiu platform.'
		},
		getStockInnerTradeXQ: {
			name: 'Get Insider Trading Data',
			description: 'Get listed company insider trading data.'
		},
		getStockHotSearchBaidu: {
			name: 'Get Baidu Stock Search',
			description: 'Get stock search heat ranking from Baidu.'
		},
		getStockATTMLYR: {
			name: 'Get A-Share Market Valuation',
			description: 'Get overall A-share market TTM P/E ratio.'
		},
		getStockAAllPB: {
			name: 'Get A-Share P/B Ratio',
			description: 'Get all A-share P/B ratio distribution.'
		},
		getStockZHAGBJGEM: {
			name: 'Get Shanghai-Shenzhen-HK Stock Connect',
			description: 'Get Shanghai-Shenzhen-HK Stock Connect holdings data.'
		},
		getOptionMargin: {
			name: 'Get Option Margin',
			description: 'Calculate margin requirements for option trading.'
		},
		getStockMarginRatioPA: {
			name: 'Get Stock Margin Trading Ratio',
			description: 'Get margin trading ratio data from Ping An Securities.'
		},
		getOptionRiskIndicatorSSE: {
			name: 'Get Option Risk Indicators - SSE',
			description: 'Get option market risk indicators from Shanghai Stock Exchange.'
		},
		getOptionDailyStatsSSE: {
			name: 'Get Option Daily Stats - SSE',
			description: 'Get daily option trading statistics from Shanghai Stock Exchange.'
		},
		getOptionDailyStatsSZSE: {
			name: 'Get Option Daily Stats - SZSE',
			description: 'Get daily option trading statistics from Shenzhen Stock Exchange.'
		},
		getOptionCommInfo: {
			name: 'Get Option Contract Info',
			description: 'Get option contract basic information and parameters.'
		},
		getFuturesHoldPosSina: {
			name: 'Get Futures Holdings - Sina',
			description: 'Get futures holdings data from Sina Finance.'
		},
		getFuturesSpotSys: {
			name: 'Get Futures vs Spot Price',
			description: 'Get futures vs spot price comparison data.'
		},
		getFuturesStockSHFEJS: {
			name: 'Get SHFE Inventory - Jin10',
			description: 'Get Shanghai Futures Exchange warehouse inventory from Jin10 Data.'
		},
		getStockZHABComparisonEM: {
			name: 'Get A-Share vs B-Share Comparison',
			description: 'Get A-share and B-share price comparison data.'
		},
		getStockMarginAccountInfo: {
			name: 'Get Margin Account Info',
			description: 'Get margin financing and securities lending account statistics.'
		},
		getCryptoBitcoinCME: {
			name: 'Get CME Bitcoin Futures',
			description: 'Get Bitcoin futures data from Chicago Mercantile Exchange.'
		},
		getCryptoBitcoinHoldReport: {
			name: 'Get Bitcoin Holdings Report',
			description: 'Get institutional Bitcoin holdings report.'
		},
		getFuturesContractInfoSHFE: {
			name: 'Get SHFE Contract Info',
			description: 'Get Shanghai Futures Exchange contract information.'
		},
		getFundIndividualBasicInfoXQ: {
			name: 'Get Fund Basic Info - Xueqiu',
			description: 'Get fund basic information data from Xueqiu.'
		},
		getFundScaleOpenSina: {
			name: 'Get Open-End Fund Scale - Sina',
			description: 'Get open-end fund scale data from Sina.'
		},
		getFundOverviewEM: {
			name: 'Get Fund Overview - East Money',
			description: 'Get fund overview information from East Money.'
		},
		getFundFeeEM: {
			name: 'Get Fund Fees - East Money',
			description: 'Get fund subscription and redemption fee information from East Money.'
		},
		getStockHKProfitForecast: {
			name: 'Get HK Stock Profit Forecast',
			description: 'Get Hong Kong stock profit forecast data.'
		},
		getFundPortfolioHoldEM: {
			name: 'Get Fund Portfolio - East Money',
			description: 'Get fund portfolio holdings from East Money.'
		},
		getFundManagerInfoEM: {
			name: 'Get Fund Manager Info - East Money',
			description: 'Get fund manager detailed information from East Money.'
		},
		getPrivateFundRank: {
			name: 'Get Private Fund Ranking',
			description: 'Get private fund performance ranking.'
		},
		getFundManagerChange: {
			name: 'Get Fund Manager Changes',
			description: 'Get fund manager change history.'
		},
		getETFRealTimePremium: {
			name: 'Get ETF Real-Time Premium',
			description: 'Get ETF real-time premium/discount data.'
		},
		getLOFRealTimePremium: {
			name: 'Get LOF Real-Time Premium',
			description: 'Get LOF fund real-time premium/discount data.'
		},
		getBondConvertPremium: {
			name: 'Get Convertible Bond Premium',
			description: 'Get convertible bond conversion premium data.'
		},
		getBondCallRedeemWarning: {
			name: 'Get Convertible Bond Call Warning',
			description: 'Get convertible bond forced redemption warning information.'
		},
		getFundShareChange: {
			name: 'Get Fund Share Changes',
			description: 'Get fund share change history data.'
		},
		getFundPurchaseRedeem: {
			name: 'Get Fund Purchase/Redemption',
			description: 'Get fund subscription and redemption status information.'
		},
		getFundRatingAllEM: {
			name: 'Get Fund Ratings - All',
			description: 'Get all fund rating data from East Money.'
		},
		getFundRatingSH: {
			name: 'Get Fund Ratings - Shanghai',
			description: 'Get fund rating data from Shanghai Securities.'
		},
		getFundOpenRankEM: {
			name: 'Get Open-End Fund Ranking',
			description: 'Get open-end fund ranking from East Money.'
		},
		getESGRatings: {
			name: 'Get ESG Ratings',
			description: 'Get corporate Environmental, Social and Governance (ESG) ratings.'
		},
		getCarbonEmissionsData: {
			name: 'Get Carbon Emissions Data',
			description: 'Get corporate carbon emissions and footprint data.'
		},
		getGreenBondData: {
			name: 'Get Green Bond Data',
			description: 'Get green bond issuance and market data.'
		},
		getESGControversyScores: {
			name: 'Get ESG Controversy Scores',
			description: 'Get corporate ESG-related controversy event scores.'
		},
		getClimateRiskAssessment: {
			name: 'Get Climate Risk Assessment',
			description: 'Assess climate change risks faced by corporations.'
		},
		getSustainabilityReports: {
			name: 'Get Sustainability Reports',
			description: 'Get corporate sustainability report summaries.'
		},
		getWaterUsageData: {
			name: 'Get Water Usage Data',
			description: 'Get corporate water consumption and management data.'
		},
		getRenewableEnergyUsage: {
			name: 'Get Renewable Energy Usage',
			description: 'Get corporate renewable energy usage ratio.'
		},
		getWasteManagementMetrics: {
			name: 'Get Waste Management Metrics',
			description: 'Get corporate waste disposal and recycling metrics.'
		},
		getSupplyChainESGMetrics: {
			name: 'Get Supply Chain ESG Metrics',
			description: 'Get supply chain environmental and social responsibility indicators.'
		},
		getBoardDiversityMetrics: {
			name: 'Get Board Diversity Metrics',
			description: 'Get board gender and background diversity metrics.'
		},
		getEmployeeSatisfactionMetrics: {
			name: 'Get Employee Satisfaction Metrics',
			description: 'Get employee satisfaction and welfare indicators.'
		},
		getESGFundScreening: {
			name: 'Get ESG Fund Screening',
			description: 'Screen investment funds meeting ESG standards.'
		},
		getGreenFinanceStats: {
			name: 'Get Green Finance Statistics',
			description: 'Get green finance market statistics.'
		},
		getCarbonCreditPrices: {
			name: 'Get Carbon Credit Prices',
			description: 'Get carbon credit trading prices.'
		},
		getESGDisclosureQuality: {
			name: 'Get ESG Disclosure Quality',
			description: 'Assess corporate ESG information disclosure quality.'
		},
		getSocialResponsibilityMetrics: {
			name: 'Get Social Responsibility Metrics',
			description: 'Get corporate social responsibility fulfillment indicators.'
		},
		getGovernanceQualityMetrics: {
			name: 'Get Governance Quality Metrics',
			description: 'Get corporate governance quality scores.'
		},
		getOrderBookDepth: {
			name: 'Get Order Book Depth',
			description: 'Get market order book depth and bid/ask distribution.'
		},
		getMicrostructureMarketMakerDepth: {
			name: 'Get Market Maker Depth',
			description: 'Get market maker quote depth and liquidity.'
		},
		getTickByTickData: {
			name: 'Get Tick-by-Tick Data',
			description: 'Get market tick-by-tick transaction detail data.'
		},
		getTradeExecutionQuality: {
			name: 'Get Trade Execution Quality',
			description: 'Assess trade execution quality and slippage.'
		},
		getSlippageAnalysis: {
			name: 'Get Slippage Analysis',
			description: 'Analyze trade slippage and market impact costs.'
		},
		getMarketImpactAnalysis: {
			name: 'Get Market Impact Analysis',
			description: 'Analyze large trade impact on market prices.'
		},
		getVWAPTWAPBenchmarks: {
			name: 'Get VWAP/TWAP Benchmarks',
			description: 'Get volume-weighted and time-weighted average prices.'
		},
		getLimitOrderBookAnalysis: {
			name: 'Get Limit Order Book Analysis',
			description: 'Analyze limit order book structure and imbalances.'
		},
		getQuoteStuffingDetection: {
			name: 'Get Quote Stuffing Detection',
			description: 'Detect market quote stuffing and abnormal behavior.'
		},
		getHFTActivityIndicators: {
			name: 'Get HFT Activity Indicators',
			description: 'Monitor high-frequency trading activity and market quality.'
		},
		getDarkPoolVolume: {
			name: 'Get Dark Pool Volume',
			description: 'Get dark pool trading volume data.'
		},
		getAuctionImbalanceIndicators: {
			name: 'Get Auction Imbalance Indicators',
			description: 'Get opening and closing auction imbalance indicators.'
		},
		getBlockTradeAnalysis: {
			name: 'Get Block Trade Analysis',
			description: 'Analyze block trade impact on markets.'
		},
		getOrderFlowImbalance: {
			name: 'Get Order Flow Imbalance',
			description: 'Monitor buy/sell order flow imbalances.'
		},
		getBidAskBounceAnalysis: {
			name: 'Get Bid-Ask Bounce Analysis',
			description: 'Analyze bid-ask spread bounce patterns.'
		},
		getTradeClassification: {
			name: 'Get Trade Classification',
			description: 'Classify trades as buyer-initiated or seller-initiated.'
		},
		getCreditRatingsHistory: {
			name: 'Get Credit Ratings History',
			description: 'Get bond and corporate credit rating history changes.'
		},
		getRatingTransitionMatrix: {
			name: 'Get Rating Transition Matrix',
			description: 'Get credit rating transition probability matrix.'
		},
		getDefaultProbability: {
			name: 'Get Default Probability',
			description: 'Calculate bond and corporate default probability.'
		},
		getCreditSpreadAnalysis: {
			name: 'Get Credit Spread Analysis',
			description: 'Analyze credit spread trends and drivers.'
		},
		getRecoveryRates: {
			name: 'Get Recovery Rates',
			description: 'Get historical recovery rate data for defaulted bonds.'
		},
		getCovenantAnalysis: {
			name: 'Get Covenant Analysis',
			description: 'Analyze bond protective and restrictive covenants.'
		},
		getDebtStructureAnalysis: {
			name: 'Get Debt Structure Analysis',
			description: 'Analyze corporate debt structure and solvency.'
		},
		getCreditEventHistory: {
			name: 'Get Credit Event History',
			description: 'Get history of credit events like defaults and downgrades.'
		},
		getBankruptcyPrediction: {
			name: 'Get Bankruptcy Prediction',
			description: 'Predict corporate bankruptcy risk and probability.'
		},
		getDistressedDebtAnalysis: {
			name: 'Get Distressed Debt Analysis',
			description: 'Analyze distressed corporate debt restructuring opportunities.'
		},
		getCreditPortfolioAnalytics: {
			name: 'Get Credit Portfolio Analytics',
			description: 'Analyze credit investment portfolio risk and return.'
		},
		getCounterpartyCreditRisk: {
			name: 'Get Counterparty Credit Risk',
			description: 'Assess counterparty credit risk.'
		},
		getSovereignCreditAnalysis: {
			name: 'Get Sovereign Credit Analysis',
			description: 'Analyze sovereign credit risk.'
		},
		getCorporateBondAnalytics: {
			name: 'Get Corporate Bond Analytics',
			description: 'Analyze corporate bond valuation and risk.'
		},
		getCreditCycleIndicators: {
			name: 'Get Credit Cycle Indicators',
			description: 'Monitor credit cycle phases and trends.'
		},
		getDebtCapacityAnalysis: {
			name: 'Get Debt Capacity Analysis',
			description: 'Analyze corporate capacity for additional debt.'
		},
		getExecutiveTrading: {
			name: 'Get Executive Trading',
			description: 'Query executive trading records including directors and supervisors buying/selling stocks, capturing insider trading signals for investment reference.'
		},
		getInstitutionalHoldings: {
			name: 'Get Institutional Holdings',
			description: 'Query shareholding details by institutional investors (funds, QFII, social security funds, etc.) to understand institutional investment preferences.'
		},
		getShareholderCount: {
			name: 'Get Shareholder Count',
			description: 'Query total shareholder count changes over time to analyze equity concentration trends and investor structure.'
		},
		getRestrictedShareRelease: {
			name: 'Get Restricted Share Release',
			description: 'Query restricted share unlock schedule including IPO restricted shares, additional issuance locked shares, lifting dates and quantities, evaluating potential selling pressure.'
		},
		getSharePledge: {
			name: 'Get Share Pledge',
			description: 'Query major shareholder pledge status including pledged quantity, pledge ratio, pledgees, monitoring credit risk and shareholder liquidity.'
		},
		getEquityIncentive: {
			name: 'Get Equity Incentive',
			description: 'Query equity incentive plan details including stock options, restricted stocks, evaluating management alignment with shareholder interests.'
		},
		getEarningsForecast: {
			name: 'Get Earnings Forecast',
			description: 'Query company earnings forecasts, analyst consensus estimates for future performance, helping understand market expectations.'
		},
		getEarningsFlash: {
			name: 'Get Earnings Flash',
			description: 'Query real-time earnings announcement summaries, including EPS, revenue, net profit, capturing immediate earnings updates.'
		},
		getTopList: {
			name: 'Get Top List',
			description: 'Query top 10 daily stocks ranked by various metrics (turnover rate, volume, price change, amplitude) discovering market hotspots and active stocks.'
		},
		getStockFinancialRatios: {
			name: 'Get Stock Financial Ratios',
			description: 'Comprehensive financial ratio analysis including profitability, liquidity, solvency, and efficiency metrics.'
		},
		getStockDCFValuation: {
			name: 'Get Stock DCF Valuation',
			description: 'Perform discounted cash flow (DCF) valuation analysis for stock intrinsic value estimation.'
		},
		getStockTechnicalIndicators: {
			name: 'Get Stock Technical Indicators',
			description: 'Query technical indicators including MACD, RSI, Bollinger Bands, KDJ for technical analysis.'
		},
		getStockIndustryComparison: {
			name: 'Get Stock Industry Comparison',
			description: 'Compare target stock\'s financial metrics with industry peers for relative valuation analysis.'
		},
		getConvertibleBondSpot: {
			name: 'Get Convertible Bond Spot',
			description: 'Query real-time convertible bond quotes including price, conversion premium, YTM, etc.'
		},
		getConvertibleBondIssuance: {
			name: 'Get Convertible Bond Issuance',
			description: 'Query convertible bond issuance data including issuer, issuance scale, conversion terms, etc.'
		},
		getCorporateBondSpot: {
			name: 'Get Corporate Bond Spot',
			description: 'Query real-time corporate bond quotes including price, yield, trading volume, etc.'
		},
		getCorporateBondIssuance: {
			name: 'Get Corporate Bond Issuance',
			description: 'Query corporate bond issuance information including issuer, issuance scale, coupon rate, maturity, etc.'
		},
		getLocalGovBondIssuance: {
			name: 'Get Local Government Bond Issuance',
			description: 'Query local government bond issuance data including issuing region, bond purpose, issuance scale, coupon rate, etc.'
		},
		getExchangeableBond: {
			name: 'Get Exchangeable Bond',
			description: 'Query exchangeable bond information including underlying stock, exchange terms, premium rate, etc.'
		},
		getABSSecurities: {
			name: 'Get ABS Securities',
			description: 'Query asset-backed securities (ABS) information including underlying assets, issuance scale, rating, etc.'
		},
		getBondCreditRating: {
			name: 'Get Bond Credit Rating',
			description: 'Query bond issuer and bond credit ratings including rating agency, rating level, outlook, etc.'
		},
		getBondRatingChanges: {
			name: 'Get Bond Rating Changes',
			description: 'Query historical bond rating change records including upgrade/downgrade events, reasons, etc.'
		},
		getBondDefaultEvents: {
			name: 'Get Bond Default Events',
			description: 'Query bond default events including default date, default amount, default type, handling progress, etc.'
		},
		getBondRepoRates: {
			name: 'Get Bond Repo Rates',
			description: 'Query interbank and exchange repo rates reflecting short-term liquidity conditions.'
		},
		getBondDurationConvexity: {
			name: 'Get Bond Duration Convexity',
			description: 'Calculate bond duration and convexity for interest rate risk assessment and hedging strategy development.'
		},
		getConversionPremiumHistory: {
			name: 'Get Conversion Premium History',
			description: 'Query convertible bond conversion premium historical data analyzing premium trends and conversion opportunities.'
		},
		getShiborRate: {
			name: 'Get SHIBOR Rate',
			description: 'Query Shanghai Interbank Offered Rate (SHIBOR) including overnight, 1-week, 1-month, 3-month, etc. reflecting interbank liquidity.'
		},
		getLPRRate: {
			name: 'Get LPR Rate',
			description: 'Query Loan Prime Rate (LPR) as benchmark for bank loan interest rates, reflecting monetary policy and credit costs.'
		},
		getAgricultureInventory: {
			name: 'Get Agriculture Inventory',
			description: 'Query agricultural commodity inventory data (grains, oilseeds) including domestic stocks, port stocks, etc.'
		},
		getAgricultureProduction: {
			name: 'Get Agriculture Production',
			description: 'Query agricultural product production data including crop yields, planting area, production forecasts, etc.'
		},
		getMetalsInventory: {
			name: 'Get Metals Inventory',
			description: 'Query metal commodity inventory data including copper, aluminum, zinc, etc. covering exchange stocks, social inventory, etc.'
		},
		getMetalsProduction: {
			name: 'Get Metals Production',
			description: 'Query metal production data including mining output, smelting output, production capacity utilization, etc.'
		},
		getMetalsTradeData: {
			name: 'Get Metals Trade Data',
			description: 'Query metal import/export data including import volume, export volume, net imports, etc.'
		},
		getOilInventory: {
			name: 'Get Oil Inventory',
			description: 'Query crude oil inventory data including commercial inventory, strategic reserves, refinery inventory, etc.'
		},
		getRefinedOilInventory: {
			name: 'Get Refined Oil Inventory',
			description: 'Query refined oil product inventory including gasoline, diesel, kerosene inventory levels.'
		},
		getNaturalGasInventory: {
			name: 'Get Natural Gas Inventory',
			description: 'Query natural gas storage data including underground storage, LNG tank storage, etc.'
		},
		getCoalInventory: {
			name: 'Get Coal Inventory',
			description: 'Query coal inventory data including port inventory, power plant inventory, social inventory, etc.'
		},
		getSteelInventory: {
			name: 'Get Steel Inventory',
			description: 'Query steel product inventory including rebar, hot-rolled coil, cold-rolled sheet inventory at mills and social warehouses.'
		},
		getChemicalInventory: {
			name: 'Get Chemical Inventory',
			description: 'Query chemical product inventory including PVC, PP, PE, PTA, ethylene, etc.'
		},
		getRubberInventory: {
			name: 'Get Rubber Inventory',
			description: 'Query natural and synthetic rubber inventory data.'
		},
		getSugarInventory: {
			name: 'Get Sugar Inventory',
			description: 'Query sugar inventory data including industrial inventory, port inventory, etc.'
		},
		getOilseedInventory: {
			name: 'Get Oilseed Inventory',
			description: 'Query oilseed and vegetable oil inventory including soybeans, soybean oil, palm oil, rapeseed oil, etc.'
		},
		getGlassData: {
			name: 'Get Glass Data',
			description: 'Query glass industry data including production, inventory, operating rate, etc.'
		},
		getCementProduction: {
			name: 'Get Cement Production',
			description: 'Query cement production data including output, clinker production, capacity utilization, etc.'
		},
		getMajorFXPairs: {
			name: 'Get Major FX Pairs',
			description: 'Query list of major currency pairs and their basic information.'
		},
		getFXPairQuote: {
			name: 'Get FX Pair Quote',
			description: 'Query specific currency pair real-time quote including bid/ask price, spread, etc.'
		},
		getFXSwapQuote: {
			name: 'Get FX Swap Quote',
			description: 'Query FX swap point quotes for different tenors used for FX forward pricing and hedging.'
		},
		getBitcoinPriceTrend: {
			name: 'Get Bitcoin Price Trend',
			description: 'Query Bitcoin historical price trends including daily/hourly OHLCV data.'
		},
		getCryptoMarketCapRanking: {
			name: 'Get Crypto Market Cap Ranking',
			description: 'Query cryptocurrency market capitalization rankings showing major coins by size.'
		},
		getCryptoExchangeRanking: {
			name: 'Get Crypto Exchange Ranking',
			description: 'Query cryptocurrency exchange rankings by trading volume, user count, etc.'
		},
		getDeFiTVL: {
			name: 'Get DeFi TVL',
			description: 'Query DeFi protocol Total Value Locked (TVL) data reflecting decentralized finance scale.'
		},
		getNFTMarketData: {
			name: 'Get NFT Market Data',
			description: 'Query NFT market data including trading volume, floor price, active users, etc.'
		},
		getMacroCPI: {
			name: 'Get Macro CPI',
			description: 'Query Consumer Price Index (CPI) data reflecting inflation levels and price changes.'
		},
		getMacroPPI: {
			name: 'Get Macro PPI',
			description: 'Query Producer Price Index (PPI) data reflecting industrial product price changes.'
		},
		getMacroGDP: {
			name: 'Get Macro GDP',
			description: 'Query Gross Domestic Product (GDP) data reflecting economic growth and size.'
		},
		getMacroPMI: {
			name: 'Get Macro PMI',
			description: 'Query Purchasing Managers\' Index (PMI) data reflecting manufacturing and services sector activity.'
		},
		getMacroMoneySupply: {
			name: 'Get Macro Money Supply',
			description: 'Query money supply data (M0, M1, M2) reflecting currency circulation and liquidity.'
		},
		// Stock Financial Analysis Depth Tools
		getIncomeStatementDetail: {
			name: 'Get Income Statement Detail',
			description: 'Get detailed income statement (利润表) with operating revenue, operating costs, sales/admin/financial expenses, R&D expenses, net profit, EPS, and year-over-year changes. Essential for profitability analysis.'
		},
		getBalanceSheetDetail: {
			name: 'Get Balance Sheet Detail',
			description: 'Get detailed balance sheet (资产负债表) with assets, liabilities, shareholders equity, current ratio, asset-liability ratio, and structure analysis. Critical for solvency assessment.'
		},
		getCashFlowDetail: {
			name: 'Get Cash Flow Detail',
			description: 'Get detailed cash flow statement (现金流量表) showing operating, investing, and financing activities. Operating cash flow quality is key indicator of business health.'
		},
		getFinancialIndicators: {
			name: 'Get Financial Indicators',
			description: 'Get comprehensive financial indicators including profitability (ROE, ROA, net margin), solvency (debt ratios), operational efficiency (turnover ratios), and growth rates. One-stop financial health check.'
		},
		getRoeDupont: {
			name: 'Get ROE DuPont Analysis',
			description: 'Get ROE DuPont analysis (杜邦分析) decomposing ROE into net profit margin × asset turnover × equity multiplier. Identifies profit drivers and leverage impact. Core valuation metric.'
		},
		getProfitabilityMetrics: {
			name: 'Get Profitability Metrics',
			description: 'Get profitability metrics including gross margin, operating margin, net margin, ROE, ROA, ROIC with historical trends. High and stable margins indicate competitive advantage.'
		},
		getOperatingEfficiency: {
			name: 'Get Operating Efficiency',
			description: 'Get operating efficiency ratios including inventory turnover, receivables turnover, payables turnover, cash conversion cycle. Higher turnover = better capital efficiency.'
		},
		getSolvencyRatios: {
			name: 'Get Solvency Ratios',
			description: 'Get solvency ratios including current ratio, quick ratio, cash ratio, debt-to-equity, interest coverage. Measures ability to meet short-term and long-term obligations.'
		},
		getGrowthMetrics: {
			name: 'Get Growth Metrics',
			description: 'Get growth metrics including revenue growth, net profit growth, EPS growth, asset growth rates. Sustained high growth commands premium valuations.'
		},
		getValuationMultiples: {
			name: 'Get Valuation Multiples',
			description: 'Get valuation multiples including P/E, P/B, P/S, EV/EBITDA ratios with sector comparisons and historical percentiles. Low multiples may indicate undervaluation.'
		},
		getPePbBand: {
			name: 'Get PE/PB Band Analysis',
			description: 'Get historical PE/PB band analysis (估值区间) showing valuation ranges over time. Trading below historical average PE/PB may signal opportunity.'
		},
		getDividendAnalysis: {
			name: 'Get Dividend Analysis',
			description: 'Get dividend analysis (分红分析) including dividend yield, payout ratio, dividend growth rate, and payout history. Consistent dividends indicate stable cash flow.'
		},
		getFreeCashFlow: {
			name: 'Get Free Cash Flow',
			description: 'Get free cash flow (FCF) analysis = Operating Cash Flow - Capital Expenditures. FCF is cash available for dividends, buybacks, debt reduction. Warren Buffett\'s favorite metric.'
		},
		getEarningsQuality: {
			name: 'Get Earnings Quality',
			description: 'Get earnings quality analysis comparing net profit vs operating cash flow. If cash flow < profit, earnings may be low quality (aggressive accounting). High quality = profit backed by cash.'
		},
		getAssetQuality: {
			name: 'Get Asset Quality',
			description: 'Get asset quality analysis examining receivables aging, inventory aging, goodwill, intangible assets. High quality assets are liquid and realizable. Beware of excessive goodwill.'
		},
		getRevenueBreakdown: {
			name: 'Get Revenue Breakdown',
			description: 'Get revenue breakdown by product, geography, customer segments. Shows business diversification and growth drivers. Concentration risk if one product/region dominates.'
		},
		getCostStructure: {
			name: 'Get Cost Structure',
			description: 'Get cost structure analysis showing COGS, operating expenses, SG&A, R&D as % of revenue. Identifies cost control effectiveness and operating leverage potential.'
		},
		getRdInvestment: {
			name: 'Get R&D Investment',
			description: 'Get R&D investment (研发投入) and R&D intensity (R&D / Revenue). High R&D indicates innovation focus, important for tech and pharma sectors. Drives long-term competitiveness.'
		},
		getCapexAnalysis: {
			name: 'Get Capex Analysis',
			description: 'Get capital expenditure (CAPEX) analysis showing investment in PP&E, growth vs maintenance capex. High capex may indicate growth phase or capital-intensive business model.'
		},
		getTaxRateAnalysis: {
			name: 'Get Tax Rate Analysis',
			description: 'Get effective tax rate analysis comparing statutory vs actual tax rates. Lower effective rates boost net profit. Sudden changes may indicate tax benefits expiring.'
		},
		getPeerComparison: {
			name: 'Get Peer Comparison',
			description: 'Get peer comparison (同业对比) benchmarking financial metrics against industry competitors. Identifies relative strengths/weaknesses and valuation gaps.'
		},
		getFinancialForecast: {
			name: 'Get Financial Forecast',
			description: 'Get financial forecast and analyst consensus (一致预期) for EPS, revenue, net profit. Shows market expectations. Beating consensus drives stock price up.'
		},
		getEarningsSurprise: {
			name: 'Get Earnings Surprise',
			description: 'Get earnings surprise history (业绩超预期) showing actual vs expected results. Consistent positive surprises = management under-promises and over-delivers.'
		},
		getQuarterlyEarningsTrend: {
			name: 'Get Quarterly Earnings Trend',
			description: 'Get quarterly earnings trend showing sequential and year-over-year growth. Identifies acceleration/deceleration in business momentum. Critical for growth stocks.'
		},
		getSegmentPerformance: {
			name: 'Get Segment Performance',
			description: 'Get business segment performance showing revenue, profit, margins by division. Identifies which business units are driving growth vs dragging down results.'
		},
		getMacroTrade: {
			name: 'Get Macro Trade',
			description: 'Query foreign trade data including import/export value, trade balance, etc.'
		},
		getMacroSocialFinancing: {
			name: 'Get Macro Social Financing',
			description: 'Query total social financing data reflecting overall financing scale and structure in the economy.'
		},
		getMacroForexReserve: {
			name: 'Get Macro Forex Reserve',
			description: 'Query foreign exchange reserve data reflecting external payment capacity and monetary policy space.'
		},
		getAnalystConsensus: {
			name: 'Get Analyst Consensus',
			description: 'Query analyst consensus ratings (buy/hold/sell) and target prices for stocks.'
		},
		getAnalystRatingChanges: {
			name: 'Get Analyst Rating Changes',
			description: 'Query analyst rating change records including upgrades and downgrades.'
		},
		getInsiderTradingSentiment: {
			name: 'Get Insider Trading Sentiment',
			description: 'Analyze insider trading sentiment based on executive and director trading activity.'
		},
		getFundHoldingsSentiment: {
			name: 'Get Fund Holdings Sentiment',
			description: 'Analyze fund holdings sentiment based on institutional position changes.'
		},
		getInstitutionalResearchCalendar: {
			name: 'Get Institutional Research Calendar',
			description: 'Query institutional research report publication schedule and coverage.'
		},
		getMediaCoverageAnalysis: {
			name: 'Get Media Coverage Analysis',
			description: 'Analyze media coverage frequency and sentiment for stocks or industries.'
		},
		getSocialMediaBuzz: {
			name: 'Get Social Media Buzz',
			description: 'Monitor social media discussion heat and sentiment for stocks or topics.'
		},
		getNewsHeatRanking: {
			name: 'Get News Heat Ranking',
			description: 'Query news heat rankings showing most discussed stocks or sectors.'
		},
		getStockSentimentIndex: {
			name: 'Get Stock Sentiment Index',
			description: 'Query comprehensive stock sentiment index synthesizing multiple alternative data sources.'
		},
		getRegulatoryFilingsSentiment: {
			name: 'Get Regulatory Filings Sentiment',
			description: 'Analyze sentiment from regulatory filings (prospectuses, shareholder letters, etc.).'
		},
		getResearchReportStats: {
			name: 'Get Research Report Stats',
			description: 'Query research report publication statistics including frequency, rating distribution, etc.'
		},
		getShortInterestTrends: {
			name: 'Get Short Interest Trends',
			description: 'Query short interest data and trends reflecting market short sentiment.'
		},
};
