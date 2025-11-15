/**
 * Bond market tools
 */

export const zhBondsTools = {
	getCurrentTime: {
			name: '获取当前时间',
			description: '获取多种格式的当前日期和时间'
		},
		append: {
			name: '追加内容',
			description: '向文件末尾追加内容'
		},
		listDirectory: {
			name: '列出目录',
			description: '列出目录中的所有文件夹和文件。返回子目录和文件,可选包含详细统计信息（大小、修改时间）。用于浏览库结构或发现现有内容。'
		},
		moveFile: {
			name: '移动文件',
			description: '使用 Obsidian FileManager 在库内移动或重命名文件'
		},
		trashFile: {
			name: '删除文件',
			description: '使用 Obsidian FileManager 将文件移动到回收站（遵循用户偏好设置）'
		},
		sed: {
			name: 'Sed 转换',
			description: '使用正则表达式对文件应用类似 sed 的文本转换。支持基本的 sed 语法（s/pattern/replacement/flags）。支持标志：g（全局）、i（不区分大小写）、m（多行）。'
		},
		fileExists: {
			name: '文件存在性检查',
			description: '使用 FileSystemAdapter 检查文件是否存在，支持大小写敏感选项'
		},
		insertAtCursor: {
			name: '在光标处插入',
			description: '在活动编辑器的当前光标位置插入文本'
		},
		// 库内搜索工具
		searchFiles: {
			name: '搜索文件',
			description: '按名称模式在库中搜索文件。支持通配符 * 和 ? 的类glob模式。'
		},
		searchContent: {
			name: '搜索内容',
			description: '使用正则表达式在文件中搜索文本内容。'
		},
		findFilesContaining: {
			name: '查找包含文本的文件',
			description: '查找包含特定文本的文件（不区分大小写的简单搜索）。'
		},
		// 增强网络搜索工具
		enhancedSearch: {
			name: '增强搜索',
			description: '高级搜索工具，聚合来自多个搜索引擎（DuckDuckGo、Google、Wikipedia等）的结果。支持文本、图片、新闻和视频搜索，具有智能排序和去重功能。'
		},
		duckduckgoTextSearch: {
			name: 'DuckDuckGo 文本搜索',
			description: '使用DuckDuckGo搜索网页。返回包含标题、URL和摘要的文本搜索结果。完全免费，无需API密钥。'
		},
		duckduckgoImageSearch: {
			name: 'DuckDuckGo 图片搜索',
			description: '使用DuckDuckGo搜索图片。返回图片URL、缩略图、标题和来源。支持大小、颜色、类型、布局和许可证筛选。'
		},
		duckduckgoNewsSearch: {
			name: 'DuckDuckGo 新闻搜索',
			description: '使用DuckDuckGo搜索新闻文章。返回包含标题、URL、日期、来源和摘要的新闻。'
		},
		duckduckgoVideoSearch: {
			name: 'DuckDuckGo 视频搜索',
			description: '使用DuckDuckGo搜索视频。返回视频标题、URL、描述、时长和发布者。'
		},
		wikipediaSearch: {
			name: 'Wikipedia 搜索',
			description: '搜索Wikipedia并检索文章内容。支持多语言（英语、中文、日语、德语、法语、西班牙语等）。返回文章标题、摘要、URL和可选的完整内容。'
		},
		wikipediaRandom: {
			name: 'Wikipedia 随机文章',
			description: '获取随机Wikipedia文章。适合发现和灵感获取。返回文章标题、URL和内容。'
		},
		getMarketQuote: {
			name: '获取市场行情',
			description: '获取股票（美股、中国A股）、加密货币和市场指数的实时或最新行情数据。支持多种代码如 AAPL（苹果）、000001.SZ（平安银行）、BTC-USD（比特币）、^DJI（道琼斯指数）、000001.SS（上证指数）。'
		},
		searchMarketSymbol: {
			name: '搜索市场代码',
			description: '通过公司名称、关键词或股票代码搜索股票代码。返回匹配的代码及其名称和交易所。当您知道公司名称但不知道确切代码时很有用。'
		},
		getStockHotRank: {
			name: '获取股票热度排行',
			description: '获取东方财富网的股票热度排行榜，显示最热门的股票及其最新价格和涨跌幅。适用于发现市场趋势和热门股票。'
		},
		getIndustryBoard: {
			name: '获取行业板块',
			description: '获取中国A股市场所有行业板块的实时行情数据。显示板块表现，包括价格变动、市值、领涨股票等。适用于行业轮动分析。'
		},
		getConceptBoard: {
			name: '获取概念板块',
			description: '获取概念/主题板块（如人工智能、新能源、芯片等）的实时行情数据。显示概念板块表现，包括价格变动、成分股、领涨股票。适用于主题投资分析。'
		},
		getBoardStocks: {
			name: '获取板块成分股',
			description: '获取特定行业或概念板块的成分股列表。显示板块内股票表现，包括价格、涨跌幅、成交量。需要从 get_industry_board 或 get_concept_board 工具获取板块代码。'
		},
		getLimitBoard: {
			name: '获取涨跌停板',
			description: '获取触及涨跌停限制的股票或大涨大跌的强势股。显示涨停板、跌停板、强势股（涨幅>7%）的换手率和成交量。'
		},
		getHotUpRank: {
			name: '获取人气飙升榜',
			description: '获取人气快速上升的股票排名。显示相比昨日的排名变化、当前排名、价格和涨跌幅。适用于发现趋势股票。'
		},
		getMarketMoneyFlow: {
			name: '获取资金流向',
			description: '获取股票的实时资金流向数据，显示机构和散户资金动向。展示主力资金流入流出、超大单、大单、中单、小单。适用于分析资金动向。'
		},
		getDragonTigerList: {
			name: '获取龙虎榜',
			description: '获取龙虎榜（日常公告板）数据，显示交易异常活跃的股票和机构席位交易情况。展示净买入、上榜原因和资金流向。收盘后更新。'
		},
		getNewStockInfo: {
			name: '获取新股信息',
			description: '获取IPO（新股）信息，包括申购日历和新上市股票表现。显示发行价、市盈率、申购日期、上市日期和首日表现。'
		},
		getMarketOverview: {
			name: '获取市场总览',
			description: '获取A股市场全面总览，包括股票总数、涨跌家数、涨跌停统计、平均涨跌幅、总成交量和涨跌分布。适用于了解整体市场情绪。'
		},
		getMovieBoxOfficeRealtime: {
			name: '获取电影实时票房',
			description: '获取当前上映电影的实时票房数据，包括今日票房、累计票房、上映天数和排名。'
		},
		getMovieBoxOfficeDaily: {
			name: '获取电影单日票房',
			description: '获取指定日期的电影单日票房数据，包括总票房、排名、票房占比和排片占比。'
		},
		getTVShowRanking: {
			name: '获取电视剧热度排行',
			description: '获取中国主流视频平台的热门电视剧排行，包括热度指数、主演和平台信息。'
		},
		getVarietyShowRanking: {
			name: '获取综艺节目热度排行',
			description: '获取中国主流视频平台的热门综艺节目排行，包括热度指数、嘉宾主持和平台信息。'
		},
		getArtistBusinessValue: {
			name: '获取艺人商业价值',
			description: '获取艺人商业价值排行，基于商业影响力、代言和市场影响力评估中国娱乐行业艺人价值。'
		},
		getArtistOnlineValue: {
			name: '获取艺人流量价值',
			description: '获取艺人流量价值排行，基于社交媒体影响力、粉丝互动和线上表现评估艺人在中国的流量价值。'
		},
		getWeatherDaily: {
			name: '获取日出日落时间',
			description: '获取全球城市的日出日落时间，包括民用晨昏蒙影时间和日照时长。'
		},
		getAirQualityHist: {
			name: '获取空气质量历史',
			description: '获取中国城市的空气质量历史数据（AQI、PM2.5、PM10等），包括空气质量指数、污染等级和健康建议。'
		},
		getAirQualityRank: {
			name: '获取空气质量排行',
			description: '获取中国主要城市的实时空气质量排行，按AQI从优到差排序。适用于城市间空气质量对比。'
		},
		getAirCityList: {
			name: '获取空气监测城市列表',
			description: '获取中国所有支持空气质量监测的城市列表，按省份和地区组织。'
		},
		getHogPriceProvinceRank: {
			name: '获取生猪价格省份排行',
			description: '获取中国各省生猪价格实时排行，显示当前价格、价格变化和趋势，用于生猪养殖行业分析。'
		},
		getHogPriceTrend: {
			name: '获取生猪价格走势',
			description: '获取全国生猪出栏均价历史走势，显示指定时期内的价格变化。适用于分析生猪养殖市场周期。'
		},
		getHogLeanPrice: {
			name: '获取瘦肉型猪价',
			description: '获取中国各地区当前瘦肉型生猪价格，显示平均价格、最高/最低价格和价格变化。'
		},
		getCornPrice: {
			name: '获取玉米价格',
			description: '获取中国全国玉米价格走势。玉米是主要的饲料原料，价格变化影响畜牧养殖成本。'
		},
		getSoybeanMealPrice: {
			name: '获取豆粕价格',
			description: '获取中国全国豆粕价格走势。豆粕是动物饲料中的关键蛋白质来源。'
		},
		getFeedCostIndex: {
			name: '获取饲料成本指数',
			description: '获取生猪养殖的综合饲料成本指数，包括玉米、豆粕和混合饲料价格。适用于分析养殖盈利能力。'
		},
		// 期货市场工具
		getFuturesRealtime: {
			name: '获取期货实时行情',
			description: '获取国内期货合约实时行情，包括价格、成交量、持仓量、结算价等。支持所有主要商品、金融和指数期货。'
		},
		getFuturesMainContract: {
			name: '获取期货主力合约',
			description: '获取期货品种的主力(成交最活跃)合约信息。返回合约代码、当前价格、持仓量、成交量。'
		},
		getFuturesPositionRank: {
			name: '获取期货持仓排名',
			description: '获取期货持仓排名，按期货公司/会员显示多头/空头持仓和成交量的前列席位。适用于追踪机构持仓。'
		},
		getFuturesWarehouseReceipt: {
			name: '获取期货仓单数据',
			description: '获取期货仓单数据，显示注册用于交割的实物商品库存。对分析供需基本面很重要。'
		},
		getFuturesInventory: {
			name: '获取期货库存数据',
			description: '获取各类商品的期货市场库存数据。显示主要仓库和交割点的库存水平。'
		},
		getComexInventory: {
			name: '获取COMEX库存数据',
			description: '获取COMEX(商品交易所)金属库存数据，如黄金、白银、铜等。每日更新，显示注册和合格库存。'
		},
		getFuturesBasis: {
			name: '获取期货基差',
			description: '获取期货基差(期货与现货价格差)。正基差表示升水，负基差表示贴水。对套利和套保很重要。'
		},
		// 期货高级数据工具
		getFuturesPositionRankSum: {
			name: '获取期货持仓排名',
			description: '获取期货经纪商/机构持仓排名数据。显示多空持仓前列及其变化。用于追踪市场主力动向。'
		},
		getFuturesWarehouseReceiptData: {
			name: '获取期货仓单数据',
			description: '获取期货合约仓单(交割仓单)数据。显示交割仓库的库存水平。对现货期货套利至关重要。'
		},
		getCFFEXDaily: {
			name: '获取中金所每日数据',
			description: '获取中国金融期货交易所(CFFEX)每日交易数据。包括股指期货(IF,IC,IH,IM,MO)和国债期货(T,TF,TS,TL)。'
		},
		getCZCEDaily: {
			name: '获取郑商所每日数据',
			description: '获取郑州商品交易所(CZCE)每日交易数据。包括农产品(小麦、棉花、白糖、PTA)和工业材料。'
		},
		getDCEDaily: {
			name: '获取大商所每日数据',
			description: '获取大连商品交易所(DCE)每日交易数据。包括农产品(大豆、玉米、鸡蛋)和化工品(塑料、PVC)。'
		},
		getSHFEDaily: {
			name: '获取上期所每日数据',
			description: '获取上海期货交易所(SHFE)每日交易数据。包括金属(铜、铝、金、银)、能源(原油)和化工品(橡胶)。'
		},
		getINEDaily: {
			name: '获取上期能源每日数据',
			description: '获取上海国际能源交易中心(INE)每日交易数据。包括原油、燃料油、低硫燃料油和20号橡胶。'
		},
		getFuturesInventoryEM: {
			name: '获取期货库存数据(东方财富)',
			description: '获取东方财富网提供的全面期货库存数据。覆盖所有主要中国期货交易所。显示每日库存变化。'
		},
		getDCECommodityOptionHist: {
			name: '获取大商所商品期权历史数据',
			description: '获取大连商品交易所商品期权历史数据。包括玉米、大豆、铁矿石、棕榈油期权。'
		},
		getCZCECommodityOptionHist: {
			name: '获取郑商所商品期权历史数据',
			description: '获取郑州商品交易所商品期权历史数据。包括白糖、棉花、PTA、甲醇期权。'
		},
		getSHFECommodityOptionHist: {
			name: '获取上期所商品期权历史数据',
			description: '获取上海期货交易所商品期权历史数据。包括铜、黄金、橡胶、铝期权。'
		},
		getGFEXCommodityOptionHist: {
			name: '获取广期所商品期权历史数据',
			description: '获取广州期货交易所商品期权历史数据。包括工业硅、动力煤、纯碱期权。'
		},
		// 债券市场工具
		getBondRealtime: {
			name: '获取债券实时行情',
			description: '获取债券实时行情，包括国债、企业债、可转债。显示收益率、价格、成交量和到期信息。'
		},
		getConvertibleBond: {
			name: '获取可转债数据',
			description: '获取可转债市场数据，包括转股溢价率、纯债价值、转股价值和到期收益率。适用于可转债套利。'
		},
		getTreasuryYieldCurve: {
			name: '获取国债收益率曲线',
			description: '获取国债收益率曲线，显示不同期限(3M/6M/1Y/3Y/5Y/7Y/10Y/30Y)的收益率。适用于分析利率预期。'
		},
		getCorporateBond: {
			name: '获取企业债数据',
			description: '获取企业债市场数据，包括债券评级、收益率、发行人和到期日。支持按评级和行业筛选。'
		},
		getBondYTM: {
			name: '获取债券到期收益率',
			description: '获取债券到期收益率(YTM)数据。YTM是持有债券至到期预期的总回报，以年化利率表示。'
		},
		getChinaUSTreasurySpread: {
			name: '获取中美国债利差',
			description: '获取中国和美国国债收益率差(10年期基准)。国际资本流动和货币走势的重要指标。'
		},
		// 债券高级数据工具
		getBondMarketQuote: {
			name: '获取债券市场行情',
			description: '获取全面债券市场行情，包括国债、企业债和地方债。实时价格含收益率、久期和评级信息。'
		},
		getBondMarketTrade: {
			name: '获取债券交易数据',
			description: '获取债券交易活跃度数据，包括成交量、价格和成交额。显示机构和散户交易模式。'
		},
		getTreasuryBondIssue: {
			name: '获取国债发行信息',
			description: '获取国债发行信息，包括发行日期、发行量、票面利率和到期日。涵盖中央政府债券和国库券。'
		},
		getCorporateBondIssue: {
			name: '获取企业债发行信息',
			description: '获取企业债发行数据，包括发行人、金额、评级、用途和承销商。对信用市场分析很重要。'
		},
		getLocalGovBondIssue: {
			name: '获取地方政府债发行信息',
			description: '获取地方政府债发行信息。显示省级/市级债券用途(基建、再融资)、金额和期限。'
		},
		getConvertibleBondValueAnalysis: {
			name: '获取可转债价值分析',
			description: '获取可转债价值分解，显示纯债价值、期权价值和总价值。对可转债套利策略至关重要。'
		},
		getConvertibleBondPremiumAnalysis: {
			name: '获取可转债溢价分析',
			description: '获取可转债溢价指标，包括转股溢价率、纯债溢价率和保本分析。定价评估的关键。'
		},
		getChinaBondYieldCurve: {
			name: '获取中债收益率曲线',
			description: '获取中央国债登记结算公司收益率曲线数据。显示1个月至30年各类债券利率期限结构。'
		},
		getSSEPledgeRepo: {
			name: '获取上交所质押式回购',
			description: '获取上海证券交易所质押式回购(债券抵押回购)交易数据。显示隔夜至182天回购利率。货币市场利率关键指标。'
		},
		getSZSEPledgeRepo: {
			name: '获取深交所质押式回购',
			description: '获取深圳证券交易所质押式回购交易数据。包括1天至6个月各期限。反映短期流动性状况。'
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
	getLprRate: {
		name: '获取LPR利率',
		description: '获取LPR(贷款市场报价利率)，包括1年期和5年期以上LPR'
	},
	getAbsSecurities: {
		name: '获取ABS证券',
		description: '获取资产支持证券(ABS)数据，包括企业ABS、信贷ABS等品种'
	},
};
