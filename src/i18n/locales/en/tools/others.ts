/**
 * Other tools - entertainment, weather, agriculture, IPO
 */

export const enOthersTools = {
	getMovieBoxOfficeRealtime: {
			name: 'Get Movie Box Office Realtime',
			description: 'Get real-time movie box office data for currently showing movies in China. Shows today\'s box office, total box office, release days, and rankings.'
		},
		getMovieBoxOfficeDaily: {
			name: 'Get Movie Box Office Daily',
			description: 'Get daily movie box office data for a specific date in China. Shows total box office, rankings, box office share, and screening rate.'
		},
		getTVShowRanking: {
			name: 'Get TV Show Ranking',
			description: 'Get popular TV drama series rankings with heat index, starring actors, and platform information from major Chinese video platforms.'
		},
		getVarietyShowRanking: {
			name: 'Get Variety Show Ranking',
			description: 'Get popular variety show rankings with heat index, hosts, and platform information from major Chinese video platforms.'
		},
		getArtistBusinessValue: {
			name: 'Get Artist Business Value',
			description: 'Get artist business value rankings based on commercial influence, endorsements, and market impact in China entertainment industry.'
		},
		getArtistOnlineValue: {
			name: 'Get Artist Online Value',
			description: 'Get artist online traffic value rankings based on social media influence, fan engagement, and online presence in China.'
		},
		getWeatherDaily: {
			name: 'Get Weather Daily',
			description: 'Get sunrise and sunset times for cities worldwide. Includes civil twilight times and daylight duration.'
		},
		getAirQualityHist: {
			name: 'Get Air Quality History',
			description: 'Get historical air quality data (AQI, PM2.5, PM10, etc.) for cities in China. Shows air quality index, pollution levels, and health recommendations.'
		},
		getAirQualityRank: {
			name: 'Get Air Quality Rank',
			description: 'Get real-time air quality rankings for major cities in China, sorted by AQI from best to worst. Useful for comparing air quality across cities.'
		},
		getAirCityList: {
			name: 'Get Air City List',
			description: 'Get the list of all cities in China that support air quality monitoring. Organized by province and region.'
		},
		getHogPriceProvinceRank: {
			name: 'Get Hog Price Province Rank',
			description: 'Get real-time live hog price rankings by province in China. Shows current prices, price changes, and trends for pig farming industry.'
		},
		getHogPriceTrend: {
			name: 'Get Hog Price Trend',
			description: 'Get national live hog price trends showing historical price changes over specified period. Useful for analyzing pig farming market cycles.'
		},
		getHogLeanPrice: {
			name: 'Get Hog Lean Price',
			description: 'Get current lean-type hog prices by region in China. Shows average price, highest/lowest prices, and price changes.'
		},
		getCornPrice: {
			name: 'Get Corn Price',
			description: 'Get national corn price trends in China. Corn is a major feed ingredient affecting livestock farming costs.'
		},
		getSoybeanMealPrice: {
			name: 'Get Soybean Meal Price',
			description: 'Get national soybean meal price trends in China. Soybean meal is a key protein source in animal feed.'
		},
		getFeedCostIndex: {
			name: 'Get Feed Cost Index',
			description: 'Get comprehensive feed cost index for pig farming including corn, soybean meal, and mixed feed prices. Useful for analyzing farming profitability.'
		},
		// Futures market tools
		getFuturesRealtime: {
			name: 'Get Futures Real-time Quotes',
			description: 'Get real-time quotes for domestic futures contracts including price, volume, open interest, settlement price, etc. Supports all major commodity, financial, and index futures.'
		},
		getFuturesMainContract: {
			name: 'Get Futures Main Contract',
			description: 'Get main (most actively traded) contract information for futures varieties. Returns contract code, current price, open interest, trading volume.'
		},
		getFuturesPositionRank: {
			name: 'Get Futures Position Rank',
			description: 'Get futures position ranking by broker/member showing top holders for long/short positions and trading volume. Useful for tracking institutional positions.'
		},
		getFuturesWarehouseReceipt: {
			name: 'Get Futures Warehouse Receipt',
			description: 'Get futures warehouse receipt data showing physical commodity inventory registered for delivery. Important for analyzing supply-demand fundamentals.'
		},
		getFuturesInventory: {
			name: 'Get Futures Inventory',
			description: 'Get futures market inventory data for various commodities. Shows stock levels at major warehouses and delivery points.'
		},
		getComexInventory: {
			name: 'Get COMEX Inventory',
			description: 'Get COMEX (Commodity Exchange) metal inventory data for gold, silver, copper, etc. Updated daily showing registered and eligible stocks.'
		},
		getFuturesBasis: {
			name: 'Get Futures Basis',
			description: 'Get futures basis (spread between futures and spot prices). Positive basis indicates contango, negative indicates backwardation. Important for arbitrage and hedging.'
		},
		// Futures advanced tools
		getFuturesPositionRankSum: {
			name: 'Get Futures Position Rankings',
			description: 'Get futures position rankings by brokers/institutions. Shows top holders of long/short positions and their changes. Useful for tracking smart money.'
		},
		getFuturesWarehouseReceiptData: {
			name: 'Get Futures Warehouse Receipt Data',
			description: 'Get warehouse receipt (delivery warrant) data for futures contracts. Shows inventory levels at delivery warehouses. Critical for spot-futures arbitrage.'
		},
		getCFFEXDaily: {
			name: 'Get CFFEX Daily Data',
			description: 'Get China Financial Futures Exchange (CFFEX) daily trading data. Includes index futures (IF, IC, IH, IM, MO) and treasury futures (T, TF, TS, TL).'
		},
		getCZCEDaily: {
			name: 'Get CZCE Daily Data',
			description: 'Get Zhengzhou Commodity Exchange (CZCE) daily trading data. Includes agricultural products (wheat, cotton, sugar, PTA) and industrial materials.'
		},
		getDCEDaily: {
			name: 'Get DCE Daily Data',
			description: 'Get Dalian Commodity Exchange (DCE) daily trading data. Includes agricultural products (soybeans, corn, eggs) and chemicals (plastics, PVC).'
		},
		getSHFEDaily: {
			name: 'Get SHFE Daily Data',
			description: 'Get Shanghai Futures Exchange (SHFE) daily trading data. Includes metals (copper, aluminum, gold, silver), energy (crude oil), and chemicals (rubber).'
		},
		getINEDaily: {
			name: 'Get INE Daily Data',
			description: 'Get Shanghai International Energy Exchange (INE) daily trading data. Includes crude oil, fuel oil, low-sulfur fuel oil, and 20# rubber.'
		},
		getFuturesInventoryEM: {
			name: 'Get Futures Inventory (EM)',
			description: 'Get comprehensive futures inventory data from East Money. Covers all major Chinese futures exchanges. Shows daily inventory changes.'
		},
		getDCECommodityOptionHist: {
			name: 'Get DCE Commodity Option History',
			description: 'Get historical data for Dalian Commodity Exchange commodity options. Includes corn, soybean, iron ore, palm oil options.'
		},
		getCZCECommodityOptionHist: {
			name: 'Get CZCE Commodity Option History',
			description: 'Get historical data for Zhengzhou Commodity Exchange commodity options. Includes sugar, cotton, PTA, methanol options.'
		},
		getSHFECommodityOptionHist: {
			name: 'Get SHFE Commodity Option History',
			description: 'Get historical data for Shanghai Futures Exchange commodity options. Includes copper, gold, rubber, aluminum options.'
		},
		getGFEXCommodityOptionHist: {
			name: 'Get GFEX Commodity Option History',
			description: 'Get historical data for Guangzhou Futures Exchange commodity options. Includes silicon, power coal, soda ash options.'
		},
		// Bond market tools
		getBondRealtime: {
			name: 'Get Bond Real-time Quotes',
			description: 'Get real-time quotes for bonds including government bonds, corporate bonds, convertible bonds. Shows yield, price, volume, and maturity information.'
		},
		getConvertibleBond: {
			name: 'Get Convertible Bond Data',
			description: 'Get convertible bond market data including conversion premium, pure bond value, conversion value, and YTM. Useful for convertible arbitrage.'
		},
		getTreasuryYieldCurve: {
			name: 'Get Treasury Yield Curve',
			description: 'Get government bond yield curve showing yields across different maturities (3M/6M/1Y/3Y/5Y/7Y/10Y/30Y). Useful for analyzing interest rate expectations.'
		},
		getCorporateBond: {
			name: 'Get Corporate Bond Data',
			description: 'Get corporate bond market data including bond ratings, yields, issuers, and maturity dates. Supports filtering by rating and industry.'
		},
		getBondYTM: {
			name: 'Get Bond YTM',
			description: 'Get bond yield to maturity (YTM) data. YTM is the total return anticipated on a bond if held until maturity, expressed as annual rate.'
		},
		getChinaUSTreasurySpread: {
			name: 'Get China-US Treasury Spread',
			description: 'Get spread between China and US treasury yields (10-year benchmark). Important indicator for international capital flows and currency movements.'
		},
		// Bond advanced tools
		getBondMarketQuote: {
			name: 'Get Bond Market Quote',
			description: 'Get comprehensive bond market quotes including treasuries, corporate bonds, and municipal bonds. Real-time pricing with yield, duration, and rating information.'
		},
		getBondMarketTrade: {
			name: 'Get Bond Market Trade',
			description: 'Get bond trading activity data including transaction volume, price, and turnover. Shows institutional and retail trading patterns.'
		},
		getTreasuryBondIssue: {
			name: 'Get Treasury Bond Issuance',
			description: 'Get treasury bond issuance information including issue date, amount, coupon rate, and maturity. Covers central government bonds and T-bills.'
		},
		getCorporateBondIssue: {
			name: 'Get Corporate Bond Issuance',
			description: 'Get corporate bond issuance data including issuer, amount, rating, purpose, and underwriters. Important for credit market analysis.'
		},
		getLocalGovBondIssue: {
			name: 'Get Local Government Bond Issuance',
			description: 'Get local government bond issuance information. Shows provincial/municipal bonds with purpose (infrastructure, refinancing), amount, and terms.'
		},
		getConvertibleBondValueAnalysis: {
			name: 'Get Convertible Bond Value Analysis',
			description: 'Get convertible bond value decomposition showing pure bond value, option value, and total value. Essential for convertible arbitrage strategies.'
		},
		getConvertibleBondPremiumAnalysis: {
			name: 'Get Convertible Bond Premium Analysis',
			description: 'Get convertible bond premium metrics including conversion premium rate, pure bond premium rate, and break-even analysis. Key for pricing evaluation.'
		},
		getChinaBondYieldCurve: {
			name: 'Get China Bond Yield Curve',
			description: 'Get China Central Depository & Clearing yield curve data. Shows term structure of interest rates from 1 month to 30 years for various bond types.'
		},
		getSSEPledgeRepo: {
			name: 'Get SSE Pledge Repo',
			description: 'Get Shanghai Stock Exchange pledge repo (bond collateral repo) trading data. Shows repo rates from overnight to 182 days. Key for money market rates.'
		},
		getSZSEPledgeRepo: {
			name: 'Get SZSE Pledge Repo',
			description: 'Get Shenzhen Stock Exchange pledge repo trading data. Includes various tenors from 1 day to 6 months. Reflects short-term liquidity conditions.'
		},
		// Options market tools
		getSSE50Option: {
			name: 'Get SSE 50 ETF Option',
			description: 'Get SSE 50 ETF option quotes (China\'s first ETF option). Returns call/put options across strikes and expirations with Greeks.'
		},
		getCSI300Option: {
			name: 'Get CSI 300 Option',
			description: 'Get CSI 300 index option quotes. Returns option chain with bid/ask, volume, open interest, and implied volatility.'
		},
		getCSI1000Option: {
			name: 'Get CSI 1000 Option',
			description: 'Get CSI 1000 index option quotes for small-cap stocks. Shows complete option chain with pricing and volume data.'
		},
		getOptionTQuotes: {
			name: 'Get Option T-Quotes',
			description: 'Get option T-shaped quotes (call/put side by side) for easy comparison. Shows strikes vertically with calls on left, puts on right.'
		},
		getOptionIV: {
			name: 'Get Option Implied Volatility',
			description: 'Get option implied volatility data showing market expectations for future price movements. Higher IV indicates higher expected volatility.'
		},
		getOptionGreeks: {
			name: 'Get Option Greeks',
			description: 'Get option Greeks (Delta/Gamma/Theta/Vega/Rho) measuring sensitivity to underlying price, time, volatility, and interest rates.'
		},
		// Options advanced tools
		getOptionGreeksDetail: {
			name: 'Get Option Greeks Detail',
			description: 'Get detailed Greeks (Delta, Gamma, Theta, Vega, Rho) data for stock options. Essential for option risk management and hedging strategies.'
		},
		getOptionMinuteData: {
			name: 'Get Option Minute Data',
			description: 'Get minute-level tick data for stock options including price, volume, and open interest changes. Useful for intraday trading and high-frequency analysis.'
		},
		getOptionVolatilitySurface: {
			name: 'Get Option Volatility Surface',
			description: 'Get implied volatility surface showing IV across different strikes and expirations. Critical for option pricing, arbitrage, and volatility trading.'
		},
		getOptionRiskMetrics: {
			name: 'Get Option Risk Metrics',
			description: 'Get option market risk metrics including position limits, margin requirements, and risk warnings. Important for risk management and compliance.'
		},
		getOptionValueAnalysis: {
			name: 'Get Option Value Analysis',
			description: 'Get option value decomposition showing intrinsic value and time value. Essential for understanding option pricing and identifying mispriced options.'
		},
		getChinaVIX: {
			name: 'Get China Volatility Index',
			description: 'Get China Volatility Index (iVIX/中国波指) showing market fear gauge. High values indicate high expected volatility and market uncertainty.'
		},
		getOptionLeaderboard: {
			name: 'Get Option Leaderboard',
			description: 'Get option leaderboard (龙虎榜) showing top traders, their positions, and trading activities. Useful for tracking smart money and institutional flows.'
		},
		getOptionPCR: {
			name: 'Get Option Put-Call Ratio',
			description: 'Get Put-Call Ratio (PCR) showing ratio of put to call volume/open interest. PCR > 1 indicates bearish sentiment, PCR < 1 indicates bullish sentiment.'
		},
		getOptionArbitrage: {
			name: 'Get Option Arbitrage Opportunities',
			description: 'Get option arbitrage opportunities including box spread, conversion, reversal arbitrage. Shows potential risk-free profit opportunities.'
		},
		getOptionMoneyness: {
			name: 'Get Option Moneyness Distribution',
			description: 'Get option moneyness distribution showing ITM (实值), ATM (平值), and OTM (虚值) option counts and volumes. Helps understand market structure.'
		},
		getOptionVolatilityComparison: {
			name: 'Get Option Volatility Comparison',
			description: 'Compare historical volatility (HV) with implied volatility (IV). When IV > HV, options are expensive; when IV < HV, options are cheap.'
		},
		getOptionTurnoverRank: {
			name: 'Get Option Turnover Ranking',
			description: 'Get option contracts ranked by turnover rate (换手率). High turnover indicates active trading and good liquidity.'
		},
		// Fund market tools
		getOpenFund: {
			name: 'Get Open-ended Fund Data',
			description: 'Get open-ended mutual fund data including net asset value (NAV), daily returns, cumulative returns, fund size, and manager information.'
		},
		getETFFund: {
			name: 'Get ETF Fund Data',
			description: 'Get ETF fund data including real-time prices, NAV, premium/discount rates, trading volume, and tracking error. Covers equity, bond, commodity, and international ETFs.'
		},
		getFundRanking: {
			name: 'Get Fund Performance Ranking',
			description: 'Get fund performance rankings by returns over different periods (1M/3M/6M/1Y/3Y/5Y). Supports filtering by fund type (equity/bond/hybrid/index).'
		},
		getFundNAVHistory: {
			name: 'Get Fund NAV History',
			description: 'Get historical net asset value (NAV) data for mutual funds. Shows daily NAV, accumulated NAV, and dividend adjustments.'
		},
		getFundHoldings: {
			name: 'Get Fund Holdings',
			description: 'Get fund portfolio holdings showing top stock/bond positions, sector allocation, and industry distribution. Updated quarterly.'
		},
		getFundManager: {
			name: 'Get Fund Manager Information',
			description: 'Get fund manager profile including managed funds, total assets under management, tenure, historical performance, and investment style.'
		},
		// Fund advanced tools
		getOpenFundRanking: {
			name: 'Get Open Fund Ranking',
			description: 'Get open-end mutual fund performance rankings by returns. Shows top performers across different periods (1D, 1W, 1M, 3M, 6M, 1Y, 3Y, 5Y). Filter by fund type.'
		},
		getExchangeFundRanking: {
			name: 'Get Exchange-traded Fund Ranking',
			description: 'Get ETF and LOF fund performance rankings. Shows on-exchange fund returns, turnover, and premium/discount rates. Useful for identifying trading opportunities.'
		},
		getMoneyFundRanking: {
			name: 'Get Money Market Fund Ranking',
			description: 'Get money market fund (MMF) yield rankings. Shows 7-day annualized yield, 10,000 份 income. Essential for cash management and liquidity strategies.'
		},
		getFundManagerInfo: {
			name: 'Get Fund Manager Detailed Info',
			description: 'Get comprehensive fund manager information including biography, investment philosophy, managed fund list, historical performance records, and career trajectory.'
		},
		getFundRating: {
			name: 'Get Fund Rating',
			description: 'Get professional fund ratings from agencies (Morningstar, Galaxy, Haitong). Shows star ratings, risk-adjusted returns, and category rankings.'
		},
		getFundStockHoldings: {
			name: 'Get Fund Stock Holdings',
			description: 'Get detailed fund stock portfolio holdings. Shows top 10 stocks, holding percentages, market values, and quarter-over-quarter changes. Updated quarterly.'
		},
		getFundBondHoldings: {
			name: 'Get Fund Bond Holdings',
			description: 'Get detailed fund bond portfolio holdings. Shows bond types (treasury, corporate, convertible), durations, and credit ratings. Updated quarterly.'
		},
		getFundScaleChange: {
			name: 'Get Fund Scale Change',
			description: 'Get fund asset scale change history. Shows total net assets, share changes, and subscription/redemption flows. Indicates fund popularity and momentum.'
		},
		getFundHolderStructure: {
			name: 'Get Fund Holder Structure',
			description: 'Get fund holder structure showing institutional vs. retail investor percentages. High institutional holding often indicates professional confidence.'
		},
		getFundDividendRanking: {
			name: 'Get Fund Dividend Ranking',
			description: 'Get fund dividend distribution rankings. Shows total dividends paid, frequency, and dividend yield. Important for income-focused investors.'
		},
		getFundDividendDetail: {
			name: 'Get Fund Dividend Detail',
			description: 'Get detailed fund dividend history including ex-dividend date, record date, payment date, and dividend amount per share. Complete dividend timeline.'
		},
		getQDIIExchangeRateIndex: {
			name: 'Get QDII Exchange Rate Index',
			description: 'Get QDII (Qualified Domestic Institutional Investor) fund exchange rate index. Tracks currency impact on QDII fund returns. Essential for international investing.'
		},
		getQDIIAllocationIndex: {
			name: 'Get QDII Allocation Index',
			description: 'Get QDII fund geographical allocation index showing regional/country exposure. Helps understand global diversification of Chinese overseas funds.'
		},
		// Macro economic data tools
		getCPI: {
			name: 'Get CPI Data',
			description: 'Get Consumer Price Index (CPI) data showing inflation rates. Includes month-over-month and year-over-year changes for various categories.'
		},
		getPPI: {
			name: 'Get PPI Data',
			description: 'Get Producer Price Index (PPI) data showing wholesale/producer inflation. Leading indicator for consumer inflation.'
		},
		getGDP: {
			name: 'Get GDP Data',
			description: 'Get Gross Domestic Product (GDP) data showing economic growth rates. Includes quarterly and annual GDP with sector breakdowns.'
		},
		getPMI: {
			name: 'Get PMI Data',
			description: 'Get Purchasing Managers\' Index (PMI) data for manufacturing and services sectors. Above 50 indicates expansion, below 50 indicates contraction.'
		},
		getMoneySupply: {
			name: 'Get Money Supply Data',
			description: 'Get money supply data (M0/M1/M2) showing currency in circulation and various deposit levels. Important for monetary policy analysis.'
		},
		getUnemploymentRate: {
			name: 'Get Unemployment Rate',
			description: 'Get unemployment rate data showing labor market conditions. Includes urban unemployment, surveyed unemployment, and regional breakdowns.'
		},
		getForexReserves: {
			name: 'Get Foreign Exchange Reserves',
			description: 'Get foreign exchange reserves data showing national reserve assets. Important indicator for currency stability and international payment capacity.'
		},
		getTSF: {
			name: 'Get Total Social Financing',
			description: 'Get Total Social Financing (TSF) data showing aggregate financing to real economy including bank loans, bonds, equity, etc.'
		},
		getMarginTrading: {
			name: 'Get Margin Trading Data',
			description: 'Get margin trading and short selling data showing leverage levels and market sentiment. Includes margin balance, short balance, and net positions.'
		},
		getBlockTrade: {
			name: 'Get Block Trade Data',
			description: 'Get block trade (large off-exchange transactions) data showing institutional trading activity. Includes trade price, volume, premium/discount to market.'
		},
		getDividend: {
			name: 'Get Dividend Data',
			description: 'Get stock dividend data including cash dividends, stock dividends, ex-dividend dates, payment dates, and dividend yields.'
		},
		getShareholderChange: {
			name: 'Get Shareholder Change Data',
			description: 'Get shareholder change data showing changes in major shareholder positions, insider trading, and equity transfers.'
		},
		getRestrictedShareUnlock: {
			name: 'Get Restricted Share Unlock Schedule',
			description: 'Get restricted share (lock-up) expiration schedule. Large unlocks can create selling pressure and affect stock prices.'
		},
		getShareBuyback: {
			name: 'Get Share Buyback Data',
			description: 'Get share buyback data showing companies repurchasing their own shares. Includes buyback amount, progress, and purpose.'
		},
		getIPOSubscription: {
			name: 'Get IPO Subscription Data',
			description: 'Get IPO subscription data including subscription ratio, winning rate, frozen funds, and issue details for new stock offerings.'
		},
		getDragonTigerListDetail: {
			name: 'Get Dragon Tiger List Detail',
			description: 'Get detailed Dragon Tiger List data showing specific trading desk buy/sell amounts, reasons for listing, and institutional vs retail breakdown.'
		},
		// Stock market data tools
		getStockAShareSpot: {
			name: 'Get A-Share Real-time Quotes',
			description: 'Get real-time quotes for A-share stocks (Shanghai/Shenzhen/Beijing markets). Returns stock code, name, price, change, volume, market cap, PE ratio, etc.'
		},
		getStockAShareHist: {
			name: 'Get A-Share Historical Data',
			description: 'Get historical OHLCV data for A-share stocks with adjustment options (forward/backward). Supports daily, weekly, monthly periods.'
		},
		getStockHKSpot: {
			name: 'Get Hong Kong Stock Real-time Quotes',
			description: 'Get real-time quotes for Hong Kong stocks (Main Board/GEM). Returns stock code, name, price, change, volume, turnover, etc.'
		},
		getStockUSSpot: {
			name: 'Get US Stock Real-time Quotes',
			description: 'Get real-time quotes for US stocks (NYSE/NASDAQ). Supports major tech and finance stocks like AAPL, TSLA, MSFT, GOOGL, etc.'
		},
		stockHkDaily: {
			name: 'Get Hong Kong Stock Historical Data',
			description: 'Get historical daily data for Hong Kong stocks including OHLC, volume, etc. Supports symbols like "00700" (Tencent), "09988" (Alibaba-SW).'
		},
		stockUsDaily: {
			name: 'Get US Stock Historical Data',
			description: 'Get historical daily data for US stocks with forward adjustment factor. Supports symbols like "AAPL" (Apple), "TSLA" (Tesla), "MSFT" (Microsoft).'
		},
		getUsStockName: {
			name: 'Get US Stock Symbol List',
			description: 'Get complete list of US stock symbols and names for all listed companies on NYSE and NASDAQ.'
		},
		stockZhAhSpot: {
			name: 'Get A+H Share Real-time Quotes',
			description: 'Get real-time quotes for A+H dual-listed stocks, comparing price differences between A-shares and H-shares.'
		},
		stockZhKcbSpot: {
			name: 'Get STAR Market Real-time Quotes',
			description: 'Get real-time quotes for STAR Market (Science and Technology Innovation Board) stocks.'
		},
		stockZhKcbDaily: {
			name: 'Get STAR Market Historical Data',
			description: 'Get historical daily data for STAR Market stocks including OHLC, volume, and trading metrics.'
		},
		stockZhIndexDaily: {
			name: 'Get Shanghai Index Historical Data',
			description: 'Get historical daily data for Shanghai Stock Exchange indices like SSE Composite (000001), SSE 50 (000016), CSI 300 (000300).'
		},
		stockSzIndexDaily: {
			name: 'Get Shenzhen Index Historical Data',
			description: 'Get historical daily data for Shenzhen Stock Exchange indices like SZSE Component (399001), ChiNext (399006), SME (399005).'
		},
		stockCsiIndexDaily: {
			name: 'Get CSI Index Historical Data',
			description: 'Get historical daily data for China Securities Index series like CSI 500 (000905), CSI 1000 (000852).'
		},
		stockSectorIndexDaily: {
			name: 'Get Sector Index Historical Data',
			description: 'Get historical daily data for industry sector indices tracking sector performance over time.'
		},
		stockThemeIndexDaily: {
			name: 'Get Theme Index Historical Data',
			description: 'Get historical daily data for thematic/concept indices tracking specific investment themes.'
		},
		getStockMinuteData: {
			name: 'Get Intraday Minute Data',
			description: 'Get intraday minute-level data for stocks. Supports 1/5/15/30/60 minute intervals. Returns timestamp, price, volume, average price.'
		},
		// Stock sector tools
		getIndustrySectorSpot: {
			name: 'Get Industry Sector Real-time Quotes',
			description: 'Get real-time quotes for industry sectors. Returns sector code, name, change%, leading stock, up/down stock count, total market cap.'
		},
		getConceptBoardSpot: {
			name: 'Get Concept Board Real-time Quotes',
			description: 'Get real-time quotes for concept boards (themes like AI, semiconductor, new energy). Returns concept code, name, change%, leading stock.'
		},
		getSectorConstituents: {
			name: 'Get Sector Constituent Stocks',
			description: 'Get constituent stocks for specific sector or concept board. Returns list of stocks with their performance within the sector.'
		},
		getSectorHist: {
			name: 'Get Sector Historical Data',
			description: 'Get historical OHLCV data for sectors and concept boards. Useful for analyzing sector trends over time.'
		},
		// Stock fund flow tools
		getIndividualFundFlow: {
			name: 'Get Individual Stock Fund Flow',
			description: 'Get capital flow data for individual stocks. Returns breakdown by order size (main force, small/medium/large/super large orders) with net inflow amounts and percentages.'
		},
		getStockFundFlowRank: {
			name: 'Get Stock Fund Flow Ranking',
			description: 'Get ranking of stocks by fund flow. Supports different time periods (today/3days/5days/10days). Helps identify stocks with strong capital inflow.'
		},
		getSectorFundFlowRank: {
			name: 'Get Sector Fund Flow Ranking',
			description: 'Get ranking of sectors by fund flow. Shows which industry sectors or concept boards are attracting capital. Supports both industry and concept types.'
		},
		getMarketFundFlow: {
			name: 'Get Market Fund Flow',
			description: 'Get overall A-share market fund flow. Returns latest day\'s main force and retail net inflow/outflow amounts. Useful for market sentiment analysis.'
		},
		// Stock special data tools
		getDTListDetail: {
			name: 'Get Dragon Tiger List',
			description: 'Get Dragon & Tiger List (异动股) showing stocks with unusual trading activity. Includes top trading desks\' buy/sell amounts, turnover rate, and reasons for listing.'
		},
		getLimitUpPool: {
			name: 'Get Limit Up Pool',
			description: 'Get limit up stocks pool (涨停板). Supports different pool types (today/strong/sub_new/broken). Returns first limit up time, open count (炸板次数), and reasons.'
		},
		getLimitDownPool: {
			name: 'Get Limit Down Pool',
			description: 'Get limit down stocks pool (跌停板). Returns stocks hitting lower price limit with first limit down time and related data.'
		},
		getIPOSubscriptionData: {
			name: 'Get IPO Subscription Data',
			description: 'Get IPO subscription data with status filter (upcoming/current/listed). Includes subscription date, issue price, winning rate, and funds raised.'
		},
		getBlockTradeDetails: {
			name: 'Get Block Trade Details',
			description: 'Get block trade (大宗交易) details with date/symbol filtering. Shows trade price, discount rate, buyer/seller trading desks.'
		},
		// Stock financial tools
		getFinancialSummary: {
			name: 'Get Financial Summary',
			description: 'Get financial summary for listed companies with key metrics including revenue, profit, EPS, ROE, and other fundamental indicators.'
		},
		getPerformanceForecast: {
			name: 'Get Performance Forecast',
			description: 'Get performance forecast (业绩预告) by year. Includes forecast type and expected change range (min/max percentages).'
		},
		getPerformanceExpress: {
			name: 'Get Performance Express',
			description: 'Get performance express (业绩快报) for quick earnings announcements. Provides preliminary financial data before formal reports.'
		},
		getFinancialStatements: {
			name: 'Get Financial Statements',
			description: 'Get three major financial statements (balance sheet/income statement/cash flow) for listed companies. Support multiple reporting periods.'
		},
		// Index data tools
		getIndexConstituents: {
			name: 'Get Index Constituents',
			description: 'Get constituent stocks for major indices (CSI 300, SSE 50, CSI 500). Returns download URL for Excel file with stock list and weights.'
		},
		getSWIndustryIndex: {
			name: 'Get Shenwan Industry Index',
			description: 'Get Shenwan (申万) industry classification index data. Supports different levels (1/2/3) of industry classification.'
		},
		// Forex tools
		getFXSpotQuote: {
			name: 'Get RMB FX Spot Quote',
			description: 'Get RMB foreign exchange spot quotes from China Foreign Exchange Trade System (CFETS). Returns official exchange rates for major currency pairs.'
		},
		getRealTimeExchangeRate: {
			name: 'Get Real-time Exchange Rate',
			description: 'Get real-time exchange rates for major currency pairs (USD/CNY, EUR/CNY, GBP/CNY, JPY/CNY). Returns current rate, high, low, and open prices.'
		},
		// Margin trading tools
		getMarginTradingSummarySSE: {
			name: 'Get SSE Margin Trading Summary',
			description: 'Get Shanghai Stock Exchange margin trading summary (融资融券汇总). Returns total margin balance and securities lending balance.'
		},
		getMarginTradingDetail: {
			name: 'Get Margin Trading Detail',
			description: 'Get detailed margin trading data for individual stocks by date. Includes margin balance (融资余额), margin buy amount (融资买入额), lending balance (融券余额), lending sell volume (融券卖出量).'
		},
		// HSGT tools
		getHSGTHoldings: {
			name: 'Get Stock Connect Holdings',
			description: 'Get Shanghai-Shenzhen-Hong Kong Stock Connect holdings (沪深港通持股). Shows which A-shares are held by Hong Kong investors, including holding shares, percentage, value, and daily changes.'
		},
		getHSGTFundFlow: {
			name: 'Get Stock Connect Fund Flow',
			description: 'Get Shanghai-Shenzhen-Hong Kong Stock Connect fund flow (沪深港通资金流向). Returns northbound net inflow (Hong Kong → A-share) and southbound net inflow (A-share → HK), breakdown by Shanghai Connect and Shenzhen Connect.'
		},
		// Cryptocurrency tools
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
	getTransactionStream: {
		name: 'Get Transaction Stream',
		description: 'Get real-time transaction stream with continuous updates of trades'
	},
	getIntradayMinuteData: {
		name: 'Get Intraday Minute Data',
		description: 'Get intraday minute-level candlestick data for current trading day'
	},
	getLargeOrderMonitor: {
		name: 'Get Large Order Monitor',
		description: 'Monitor large orders in real-time for detecting institutional activity'
	},
	getOptionsChainRealtime: {
		name: 'Get Options Chain Realtime',
		description: 'Get real-time options chain showing all strikes with Greeks'
	},
	getFuturesOrderBook: {
		name: 'Get Futures Order Book',
		description: 'Get futures contract order book showing bid/ask depth'
	},
	getBondQuotesStream: {
		name: 'Get Bond Quotes Stream',
		description: 'Get real-time bond quotes stream with yield calculations'
	},
	getForexTicks: {
		name: 'Get Forex Ticks',
		description: 'Get real-time forex tick data for currency pairs'
	},
        getUsEarningsCalendar: {
                name: 'Get US Earnings Calendar',
                description: 'Get US stock earnings announcement calendar'
        },
        getUsInstitutionalHoldings: {
                name: 'Get US Institutional Holdings',
                description: 'Get US stock institutional holdings from 13F filings'
        },
        getUsInsiderTrading: {
                name: 'Get US Insider Trading',
                description: 'Get US stock insider trading from Form 4 filings showing executive buys/sells, transaction dates, prices'
        },
        getUsDividendCalendar: {
                name: 'Get US Dividend Calendar',
                description: 'Get US stock dividend calendar showing ex-dividend dates, payment dates, dividend amounts, yields'
        },
        getAdrData: {
                name: 'Get ADR Data',
                description: 'Get ADR (American Depositary Receipt) data including conversion ratios, underlying stock info, arbitrage opportunities'
        },
        getHkConnectQuotaUsage: {
                name: 'Get HK Connect Quota Usage',
                description: 'Get Hong Kong Stock Connect (Southbound Trading) daily quota usage and remaining quota'
        },
        getHkIpoCalendar: {
                name: 'Get HK IPO Calendar',
                description: 'Get Hong Kong stock IPO calendar showing listing dates, offer prices, subscription details'
        },
        getHkMajorShareholders: {
                name: 'Get HK Major Shareholders',
                description: 'Get Hong Kong stock major shareholders from substantial shareholder notices (5%+ holdings)'
        },
        getHkWarrantData: {
                name: 'Get HK Warrant Data',
                description: 'Get Hong Kong warrant (cbbc/warrant) data including strike prices, expiry dates, leverage ratios'
        },
        getUsConferenceCallSchedule: {
                name: 'Get US Conference Call Schedule',
                description: 'Get US stock earnings conference call schedule with dates, times, dial-in information'
        },
        getUsAnalystEstimates: {
                name: 'Get US Analyst Estimates',
                description: 'Get US stock analyst consensus estimates showing revenue, EPS, growth forecasts with estimate ranges'
        },
        getUsOptionsExpirationCalendar: {
                name: 'Get US Options Expiration Calendar',
                description: 'Get US stock options expiration calendar showing monthly and weekly expiration dates'
        },
        getHkShortSellingData: {
                name: 'Get HK Short Selling Data',
                description: 'Get Hong Kong stock short selling data showing short turnover, short percentage of total turnover'
        },
        getAhPremiumTracking: {
                name: 'Get AH Premium Tracking',
                description: 'Get A-share vs H-share premium/discount tracking for dual-listed stocks showing price differences'
        },
        getBankNetInterestMargin: {
                name: 'Get Bank Net Interest Margin',
                description: 'Get banking sector net interest margin (NIM) trends showing interest income vs cost trends'
        },
        getBankLoanDepositRatio: {
                name: 'Get Bank Loan-Deposit Ratio',
                description: 'Get banking sector loan-to-deposit ratios showing liquidity management and lending capacity'
        },
        getBankNplRatio: {
                name: 'Get Bank NPL Ratio',
                description: 'Get banking sector non-performing loan (NPL) ratios showing asset quality and credit risk'
        },
        getInsurancePremiumIncome: {
                name: 'Get Insurance Premium Income',
                description: 'Get insurance sector premium income by category (life, property, health) showing revenue breakdown'
        },
        getInsuranceSolvencyRatio: {
                name: 'Get Insurance Solvency Ratio',
                description: 'Get insurance sector solvency ratios showing financial strength and regulatory compliance'
        },
        getInsuranceCombinedRatio: {
                name: 'Get Insurance Combined Ratio',
                description: 'Get insurance sector combined ratios (loss ratio + expense ratio) showing underwriting profitability'
        },
        getRealEstateSalesData: {
                name: 'Get Real Estate Sales Data',
                description: 'Get real estate sector sales data by city/region showing property sales volumes and amounts'
        },
        getLandTransactionData: {
                name: 'Get Land Transaction Data',
                description: 'Get land transaction data showing auction results, land prices, transaction volumes by city'
        },
        getPropertyInventoryLevels: {
                name: 'Get Property Inventory Levels',
                description: 'Get property inventory levels showing unsold units, inventory months, supply overhang by city'
        },
        getPropertyPriceIndices: {
                name: 'Get Property Price Indices',
                description: 'Get property price indices showing price trends (new homes, resale homes) by city'
        },
        getDrugApprovalPipeline: {
                name: 'Get Drug Approval Pipeline',
                description: 'Get drug approval pipeline from NMPA showing approval status, clinical trial phases, drug categories'
        },
        getClinicalTrialData: {
                name: 'Get Clinical Trial Data',
                description: 'Get clinical trial data showing trial phases, disease areas, enrollment status, study progress'
        },
        getMedicalDeviceRegistration: {
                name: 'Get Medical Device Registration',
                description: 'Get medical device registration data from NMPA showing approval status, device categories, companies'
        },
        getHospitalOperationMetrics: {
                name: 'Get Hospital Operation Metrics',
                description: 'Get hospital operation metrics showing patient volumes, bed occupancy rates, revenue per bed, operational efficiency'
        },
        getReitsPerformance: {
                name: 'Get REITs Performance',
                description: 'Get REITs (Real Estate Investment Trusts) performance showing NAV, distribution yield, premium/discount rates'
        },
        getTelecomOperatorMetrics: {
                name: 'Get Telecom Operator Metrics',
                description: 'Get telecom operator metrics showing subscriber counts, ARPU, churn rates, 5G penetration'
        },
        getAutomotiveSalesData: {
                name: 'Get Automotive Sales Data',
                description: 'Get automotive sales data by manufacturer and model showing monthly sales volumes, market share, YoY growth'
        },
        getBacktestingResults: {
                name: 'Get Backtesting Results',
                description: 'Get backtesting results for quantitative strategies showing returns, Sharpe ratio, max drawdown, win rate'
        },
        getCorrelationMatrix: {
                name: 'Get Correlation Matrix',
                description: 'Get correlation matrix for a list of stocks showing price correlation coefficients'
        },
        getStockBeta: {
                name: 'Get Stock Beta',
                description: 'Get stock beta coefficient showing systematic risk vs benchmarks (SSE 50, CSI 300, CSI 500)'
        },
        getMomentumIndicators: {
                name: 'Get Momentum Indicators',
                description: 'Get momentum indicators for stock: RSI, MACD, KDJ showing overbought/oversold conditions'
        },
        getTechnicalPatternRecognition: {
                name: 'Get Technical Pattern Recognition',
                description: 'Get technical pattern recognition for stocks: head-shoulders, triangles, flags, double-top/bottom patterns'
        },
        getVolatilityAnalysis: {
                name: 'Get Volatility Analysis',
                description: 'Get stock volatility analysis showing historical volatility, volatility percentile, vol trends'
        },
        getMeanReversionSignals: {
                name: 'Get Mean Reversion Signals',
                description: 'Get mean reversion signals showing stocks trading away from historical means with potential reversal opportunities'
        },
        getPairTradingOpportunities: {
                name: 'Get Pair Trading Opportunities',
                description: 'Get pair trading opportunities showing cointegrated stock pairs with spread statistics'
        },
        getStockRankingMultiMetric: {
                name: 'Get Stock Ranking Multi-Metric',
                description: 'Get stock rankings by multiple metrics with weighted scoring: value, growth, profitability, momentum'
        },
        getSectorMomentumRanking: {
                name: 'Get Sector Momentum Ranking',
                description: 'Get sector momentum ranking showing which sectors have strongest/weakest relative strength and momentum'
        },
        getRelativeStrength: {
                name: 'Get Relative Strength',
                description: 'Get stock relative strength index (RS) vs benchmark showing outperformance/underperformance'
        },
        getAlphaGeneration: {
                name: 'Get Alpha Generation',
                description: 'Get stock alpha generation analysis showing excess returns vs benchmark with attribution to factors'
        },
};