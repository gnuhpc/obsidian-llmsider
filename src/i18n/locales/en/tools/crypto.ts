/**
 * Cryptocurrency tools
 */

export const enCryptoTools = {
	getCryptoSpot: {
			name: 'Get Cryptocurrency Spot Quotes',
			description: 'Get real-time cryptocurrency spot quotes. Supports major cryptocurrencies like BTC, ETH, BNB, XRP, ADA, DOGE, SOL, DOT. Returns price, high, low, volume, and change percentage.'
		},
		// Automotive tools
		getCarSalesRanking: {
			name: 'Get Car Sales Ranking',
			description: 'Get automobile sales ranking data with year/month selection. Shows top-selling car models and manufacturers.'
		},
		getNEVSales: {
			name: 'Get New Energy Vehicle Sales',
			description: 'Get New Energy Vehicle (NEV) sales data including electric and hybrid vehicles. Useful for analyzing NEV market trends.'
		},
		// IPO data tools
		getIPOSubscriptionList: {
			name: 'Get IPO Subscription List',
			description: 'Get new stock subscription and lottery data, including subscription code, stock name, subscription date, lottery announcement date, winning rate, and issue price.'
		},
		getIPOAuditKCB: {
			name: 'Get STAR Market IPO Audit',
			description: 'Get STAR Market (科创板) IPO audit information, including company name, audit status, acceptance date, and listing date.'
		},
		getIPOAuditCYB: {
			name: 'Get ChiNext IPO Audit',
			description: 'Get ChiNext (创业板) IPO audit information, including company name, audit status, acceptance date, and listing date.'
		},
		getIPOAuditBJ: {
			name: 'Get Beijing Stock Exchange IPO Audit',
			description: 'Get Beijing Stock Exchange IPO audit information, tracking the audit status of new listings.'
		},
		getIPOProfitRate: {
			name: 'Get IPO First-Day Returns',
			description: 'Get first-day returns for new stock listings. Supports market filter (ALL/SH/SZ/BJ). Returns issue price, opening price, closing price, and first-day change percentage.'
		},
		getIPOBenefitStocks: {
			name: 'Get IPO Beneficiary Stocks',
			description: 'Identify stocks that benefit from new listings, showing benefit score ranking.'
		},
		getNewStockFirstDay: {
			name: 'Get New Stock First-Day Performance',
			description: 'Get detailed first-day trading performance, including first-day change, turnover rate, and trading volume.'
		},
		// Stock depth analysis tools
		getShareholderNumber: {
			name: 'Get Shareholder Count',
			description: 'Track shareholder count changes for chip concentration analysis. Decreasing shareholders often indicates concentration. Requires stock symbol.'
		},
		getExecutiveHoldingChange: {
			name: 'Get Executive Holding Changes',
			description: 'Monitor director/executive holding changes. Supports date range filtering. Returns change person, change amount, and change reason.'
		},
		getInstitutionResearchStats: {
			name: 'Get Institution Research Statistics',
			description: 'Aggregate institutional research statistics. Optional symbol/date filters. Returns research count, institution count, and reception method.'
		},
		getInstitutionResearchDetail: {
			name: 'Get Institution Research Detail',
			description: 'Get detailed institutional research information, including institution list and research content summary. Requires stock symbol.'
		},
		getEquityPledgeProfile: {
			name: 'Get Equity Pledge Market Overview',
			description: 'Get market-wide equity pledge overview, including total pledged shares, pledge market value, and pledge ratio.'
		},
		getCompanyPledgeRatio: {
			name: 'Get Company Pledge Ratios',
			description: 'Get company pledge ratios sorted by ratio descending to identify high-risk companies. Optional symbol filter.'
		},
		getPledgeDetail: {
			name: 'Get Pledge Details',
			description: 'Get major shareholder pledge details, including pledging shareholder, pledged shares, start date, and pledgee institution. Requires stock symbol.'
		},
		getProfitForecast: {
			name: 'Get Profit Forecasts',
			description: 'Get institutional earnings forecasts, including forecast EPS and forecast net profit. Requires stock symbol.'
		},
		getCapitalStructure: {
			name: 'Get Capital Structure',
			description: 'Get capital structure analysis showing debt vs equity composition, weighted average cost of capital (WACC), and optimal leverage. Too much debt increases financial risk.'
		},
		getWorkingCapital: {
			name: 'Get Working Capital',
			description: 'Get working capital analysis showing current assets, current liabilities, working capital ratio, and trends. Positive working capital = liquidity to fund operations.'
		},
		stockDcfValuation: {
			name: 'DCF Valuation Model',
			description: 'Perform DCF (Discounted Cash Flow) valuation on stocks, calculating intrinsic value based on future cash flows.'
		},
		stockTechnicalIndicators: {
			name: 'Technical Indicators Analysis',
			description: 'Calculate and analyze technical indicators including MA, MACD, RSI, Bollinger Bands, KDJ, and more.'
		},
		stockIndustryComparison: {
			name: 'Industry Comparison Analysis',
			description: 'Compare stock performance with industry peers, showing relative valuation, profitability, and growth metrics.'
		},
		getStockDividend: {
			name: 'Get Stock Dividend History',
			description: 'Get historical dividend distribution data including dividend amount, payout ratio, dividend yield, and ex-dividend dates.'
		},
		getStockBuyback: {
			name: 'Get Stock Buyback Data',
			description: 'Get stock buyback (repurchase) information including buyback amount, progress, and implementation plans.'
		},
		getStockOffering: {
			name: 'Get Stock Offering Data',
			description: 'Get stock offering (additional issuance) data including offering price, amount, and purpose.'
		},
		getStockTickData: {
			name: 'Get Tick-by-Tick Data',
			description: 'Get real-time tick-level trading data showing each transaction with price, volume, and timestamp.'
		},
		getOrderBookLevel2: {
			name: 'Get Level-2 Order Book',
			description: 'Get Level-2 market depth data showing bid/ask orders with 5-level depth.'
		},
		getOrderBookLevel2Full: {
			name: 'Get Full Level-2 Order Book',
			description: 'Get complete Level-2 market depth with all price levels and order volumes.'
		},
		getMarketSnapshot: {
			name: 'Get Market Snapshot',
			description: 'Get comprehensive market snapshot including index quotes, advance/decline ratio, volume, and top movers.'
		},
		getIndexCompositionRealtime: {
			name: 'Get Index Composition Real-time',
			description: 'Get real-time constituent stocks of major indices with their weights and contributions to index movement.'
		},
		getSectorRotationRealtime: {
			name: 'Get Sector Rotation Real-time',
			description: 'Get real-time sector rotation data showing capital flows between different industry sectors.'
		},
		getMarketBreadth: {
			name: 'Get Market Breadth Indicators',
			description: 'Get market breadth indicators including advance-decline line, new highs-lows, and volume ratios.'
		},
		getMarketMakerQuotes: {
			name: 'Get Market Maker Quotes',
			description: 'Get market maker bid/ask quotes showing institutional trading intentions and liquidity provision.'
		},
		getAuctionData: {
			name: 'Get Auction Data',
			description: 'Get call auction data showing order imbalance, indicative price, and volume during opening/closing auction periods.'
		},
		getStockMentionTrends: {
			name: 'Get Stock Mention Trends',
			description: 'Get trending stocks based on mention volume across news, forums, and social media over time.'
		},
		getEarningsCallTranscriptsIndex: {
			name: 'Get Earnings Call Transcripts Index',
			description: 'Get index of earnings call transcripts with key topics, management tone analysis, and Q&A highlights.'
		},
		getUsExtendedHoursQuotes: {
			name: 'Get US Extended Hours Quotes',
			description: 'Get US stock premarket and afterhours trading quotes showing extended hours price, volume, and changes.'
		},
		getUsStockSplitsCalendar: {
			name: 'Get US Stock Splits Calendar',
			description: 'Get US stock splits calendar showing split ratios, announcement dates, and effective dates.'
		},
		getHkBuybackAnnouncements: {
			name: 'Get HK Buyback Announcements',
			description: 'Get Hong Kong stock buyback announcements showing buyback amounts, progress, and dates.'
		},
		getGlobalIndicesRealtime: {
			name: 'Get Global Indices Realtime',
			description: 'Get realtime quotes for major global stock indices: Dow Jones, S&P 500, Nasdaq, FTSE, DAX, Nikkei, etc.'
		},
		getBankCapitalAdequacy: {
			name: 'Get Bank Capital Adequacy',
			description: 'Get banking sector capital adequacy ratios (CAR) showing regulatory compliance and solvency.'
		},
		getStockFactorExposure: {
			name: 'Get Stock Factor Exposure',
			description: 'Get stock factor exposure analysis showing exposures to value, growth, momentum, quality, size, and volatility factors.'
		},
		getStockScreening: {
			name: 'Get Stock Screening',
			description: 'Get stock screening results with multiple criteria: PE, PB, ROE, revenue growth, market cap, etc.'
		},
		// Technical stock selection tools
		getStockNewHigh: {
			name: 'Get Stocks at New Highs',
			description: 'Get stocks reaching historical or recent highs. Useful for capturing strong momentum stocks. Period options: 60/180/360 days, or all-time high.'
		},
		getStockNewLow: {
			name: 'Get Stocks at New Lows',
			description: 'Get stocks reaching historical or recent lows. Useful for identifying weak stocks or reversal opportunities. Period options: 60/180/360 days, or all-time low.'
		},
		getContinuousRise: {
			name: 'Get Continuously Rising Stocks',
			description: 'Get stocks with consecutive up days, including consecutive days count and cumulative gain. Default minimum 3 consecutive days.'
		},
		getContinuousFall: {
			name: 'Get Continuously Falling Stocks',
			description: 'Get stocks with consecutive down days, including consecutive days count and cumulative loss. Default minimum 3 consecutive days.'
		},
		getContinuousVolume: {
			name: 'Get Continuously High Volume Stocks',
			description: 'Get stocks with sustained high trading volume, useful for identifying continuous capital inflow. Default minimum 3 consecutive days.'
		},
		getContinuousVolumeShrink: {
			name: 'Get Continuously Low Volume Stocks',
			description: 'Get stocks with sustained low trading volume, useful for identifying low liquidity or trend exhaustion. Default minimum 3 consecutive days.'
		},
		getVolumePriceRise: {
			name: 'Get Volume-Price Rising Stocks',
			description: 'Get stocks with both price and volume rising, considered a healthy uptrend pattern.'
		},
		getVolumePriceFall: {
			name: 'Get Volume-Price Falling Stocks',
			description: 'Get stocks with both price and volume falling. Price drop with volume increase may indicate panic selling.'
		},
		getMarketAnomaly: {
			name: 'Get Market Anomalies',
			description: 'Get unusual market activities including quick rises, quick falls, big buying, big selling, limit up/down sealing, and auction changes.'
		},
		getBoardAnomaly: {
			name: 'Get Board Anomalies',
			description: 'Get sector/board anomaly data to identify rapidly changing market hot spots.'
		},
		// News and sentiment tools
		getCCTVNews: {
			name: 'Get CCTV News Transcript',
			description: 'Get CCTV News (新闻联播) text transcript, useful for analyzing policy direction and market hot topics. Requires date (YYYYMMDD).'
		},
		getFinancialNews: {
			name: 'Get Financial News',
			description: 'Get financial news from multiple sources including Securities Times, CLS, Yicai, EEO, and 21st Century Business Herald. Optional source and count filters.'
		},
		getStockPopularity: {
			name: 'Get Stock Popularity Ranking',
			description: 'Get stock popularity ranking based on attention, search heat, and other metrics. Supports market filter (all/sh/sz).'
		},
		getNewsSentiment: {
			name: 'Get News Sentiment Index',
			description: 'Get market news sentiment index for quantitative sentiment analysis. Optional stock symbol, otherwise returns overall market sentiment.'
		},
		getWeiboSentiment: {
			name: 'Get Weibo Financial Sentiment',
			description: 'Get Weibo financial sentiment index reflecting social media market sentiment.'
		},
		getEconomicCalendar: {
			name: 'Get Economic Calendar',
			description: 'Get important economic data release calendar, including GDP, CPI, PMI announcement dates. Supports date range filtering.'
		},
		getResearchReports: {
			name: 'Get Research Reports',
			description: 'Get brokerage research reports list. Supports filtering by stock symbol and report type (company/industry/macro/strategy). Default 50 reports.'
		},
		// Futures detailed data tools
		getFuturesHoldingRankDetail: {
			name: 'Get Futures Holding Rank Detail',
			description: 'Get detailed futures holding ranking data, including volume rank, long position rank, and short position rank. Requires symbol and date.'
		},
		getWarehouseReceiptDetail: {
			name: 'Get Warehouse Receipt Detail',
			description: 'Get detailed daily warehouse receipt data, useful for analyzing spot supply situation. Requires futures symbol and date.'
		},
		getFuturesRollYield: {
			name: 'Get Futures Roll Yield',
			description: 'Get futures roll yield data for analyzing near-far month contract spreads. Requires futures symbol.'
		},
		getFuturesSpotPrice: {
			name: 'Get Futures vs Spot Price',
			description: 'Get futures and spot price comparison data for analyzing basis. Requires futures symbol.'
		},
		getCommodityInventory: {
			name: 'Get Commodity Inventory',
			description: 'Get commodity social inventory data. Supports commodities: rebar, hot-rolled coil, wire rod, copper, aluminum, zinc, lead, nickel.'
		},
		// Macro economic data tools (detailed)
		getChinaSocialFinancing: {
			name: 'Get China Social Financing',
			description: 'Get China Total Social Financing stock and increment data, reflecting real economy financing conditions.'
		},
		getChinaReserveRatio: {
			name: 'Get China Reserve Ratio',
			description: 'Get China reserve requirement ratio adjustment history, an important monetary policy tool.'
		},
		getChinaIndustrialValueAdded: {
			name: 'Get China Industrial Value Added',
			description: 'Get China industrial value added data above designated size, reflecting industrial production activities.'
		},
		getUSNonFarmPayroll: {
			name: 'Get US Non-Farm Payroll',
			description: 'Get US non-farm payroll data, one of the most important US economic indicators.'
		},
		getUSADPEmployment: {
			name: 'Get US ADP Employment',
			description: 'Get US ADP employment data, a leading indicator for non-farm payroll.'
		},
		getUSCPI: {
			name: 'Get US CPI',
			description: 'Get US Consumer Price Index (CPI) data for measuring inflation.'
		},
		getUSPPI: {
			name: 'Get US PPI',
			description: 'Get US Producer Price Index (PPI) data, reflecting production-level price changes.'
		},
		getUSPMI: {
			name: 'Get US PMI',
			description: 'Get US Purchasing Managers Index (PMI) data, including manufacturing and services PMI. Optional type filter.'
		},
		getUSRetailSales: {
			name: 'Get US Retail Sales',
			description: 'Get US retail sales data reflecting consumer spending patterns.'
		},
		getUSInitialJobless: {
			name: 'Get US Initial Jobless Claims',
			description: 'Get US initial jobless claims data, a high-frequency employment indicator.'
		},
		getUSEIACrude: {
			name: 'Get US EIA Crude Oil Inventory',
			description: 'Get US EIA crude oil inventory data, an important indicator affecting crude oil prices.'
		},
		getUSAPICrude: {
			name: 'Get US API Crude Oil Inventory',
			description: 'Get US API crude oil inventory data, a leading indicator for EIA data.'
		},
		getMetalFuturesSpreads: {
			name: 'Get Metal Futures Spreads',
			description: 'Get calendar spreads for metal futures (copper, aluminum, zinc, lead, nickel, tin).'
		},
		getEnergyFuturesSpreads: {
			name: 'Get Energy Futures Spreads',
			description: 'Get calendar spreads for energy futures (crude oil, fuel oil, natural gas) showing contango/backwardation.'
		},
		getAgriculturalFuturesBasis: {
			name: 'Get Agricultural Futures Basis',
			description: 'Get basis (spot price - futures price) for agricultural products (corn, soybean, wheat, cotton, sugar).'
		},
		getCOTReports: {
			name: 'Get COT Reports',
			description: 'Get CFTC Commitments of Traders reports showing commercial, non-commercial and retail positions.'
		},
		getWarehouseStocksByLocation: {
			name: 'Get Warehouse Stocks by Location',
			description: 'Get futures warehouse inventory data by delivery warehouse location.'
		},
		getFreightRates: {
			name: 'Get Freight Rates',
			description: 'Get freight rates for dry bulk and container shipping affecting commodity costs.'
		},
		getCommoditySeasonality: {
			name: 'Get Commodity Seasonality',
			description: 'Get historical seasonal price patterns and trends for commodities.'
		},
		getCommodityProductionCosts: {
			name: 'Get Commodity Production Costs',
			description: 'Get production cost estimates for major commodities.'
		},
		getFuturesTermStructure: {
			name: 'Get Futures Term Structure',
			description: 'Get complete term structure curve for futures contracts.'
		},
		getCommodityTradeFlows: {
			name: 'Get Commodity Trade Flows',
			description: 'Get global commodity import/export trade flow data.'
		},
		getCommoditySupplyDemand: {
			name: 'Get Commodity Supply/Demand',
			description: 'Get commodity supply/demand balance tables and inventory data.'
		},
		getRefineryMargins: {
			name: 'Get Refinery Margins',
			description: 'Get crude oil refinery processing margins and crack spreads.'
		},
		getCommodityWeatherImpact: {
			name: 'Get Commodity Weather Impact',
			description: 'Get weather condition impact analysis on agricultural and energy commodities.'
		},
		getCommodityCorrelation: {
			name: 'Get Commodity Correlation',
			description: 'Get price correlation matrix between different commodities.'
		},
		getFuturesOpenInterestAnalysis: {
			name: 'Get Futures Open Interest Analysis',
			description: 'Analyze futures contract open interest changes and market sentiment.'
		},
		getCommodityIndexTracking: {
			name: 'Get Commodity Index Tracking',
			description: 'Track major commodity indices like CRB, S&P GSCI.'
		},
		getFuturesVolumeAnalysis: {
			name: 'Get Futures Volume Analysis',
			description: 'Analyze futures trading volume patterns and liquidity.'
		},
		getCommodityArbitrageOpportunities: {
			name: 'Get Commodity Arbitrage Opportunities',
			description: 'Identify cross-market and cross-commodity arbitrage opportunities.'
		},
		getFuturesRolloverAnalysis: {
			name: 'Get Futures Rollover Analysis',
			description: 'Analyze futures contract rollover costs and roll yields.'
		},
		getCommodityMarketDepth: {
			name: 'Get Commodity Market Depth',
			description: 'Get commodity futures market depth and liquidity indicators.'
		},
		getInterestRateSwapRates: {
			name: 'Get Interest Rate Swap Rates',
			description: 'Get interest rate swap (IRS) rate curves for different maturities.'
		},
		getEquityIndexDerivatives: {
			name: 'Get Equity Index Derivatives',
			description: 'Get market data for equity index futures and options.'
		},
		getVolatilitySurfaceAnalysis: {
			name: 'Get Volatility Surface Analysis',
			description: 'Analyze option implied volatility surface structure.'
		},
		getOptionStrategyAnalysis: {
			name: 'Get Option Strategy Analysis',
			description: 'Analyze P&L and risks of common option combination strategies.'
		},
		getSwaptionData: {
			name: 'Get Swaption Data',
			description: 'Get interest rate swaption quote data.'
		},
		getVarianceSwapRates: {
			name: 'Get Variance Swap Rates',
			description: 'Get variance swap and volatility swap quotes.'
		},
		getExoticOptionsData: {
			name: 'Get Exotic Options Data',
			description: 'Get data for barrier options, Asian options and other exotic options.'
		},
		getCDSSpreads: {
			name: 'Get CDS Spreads',
			description: 'Get credit default swap (CDS) spread data.'
		},
		getForwardRateAgreements: {
			name: 'Get Forward Rate Agreements',
			description: 'Get forward rate agreement (FRA) quotes.'
		},
		getInterestRateCapFloor: {
			name: 'Get Interest Rate Cap/Floor',
			description: 'Get interest rate cap and floor option data.'
		},
		getEquityDerivativesOIDistribution: {
			name: 'Get Equity Derivatives OI Distribution',
			description: 'Get equity option open interest distribution.'
		},
		getVolatilityArbitrageSignals: {
			name: 'Get Volatility Arbitrage Signals',
			description: 'Identify volatility arbitrage opportunities and signals.'
		},
		getDividendSwapRates: {
			name: 'Get Dividend Swap Rates',
			description: 'Get dividend swap contract quotes.'
		},
		getCorrelationSwapQuotes: {
			name: 'Get Correlation Swap Quotes',
			description: 'Get correlation swap product quotes.'
		},
		getEquityDispersionTrading: {
			name: 'Get Equity Dispersion Trading',
			description: 'Get equity index constituent dispersion trading opportunities.'
		},
		getOptionImpliedCorrelation: {
			name: 'Get Option Implied Correlation',
			description: 'Extract implied correlation from option prices.'
		},
		getCrossCurrencyBasisSwaps: {
			name: 'Get Cross-Currency Basis Swaps',
			description: 'Get cross-currency basis swap spreads.'
		},
		getTotalReturnSwaps: {
			name: 'Get Total Return Swaps',
			description: 'Get total return swap (TRS) contract data.'
		},
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
