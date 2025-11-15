import { BuiltInTool } from './built-in-tools';
import { requestUrl } from 'obsidian';

/**
 * 股票分红数据 - Stock Dividend Data
 * 获取个股的分红派息历史数据
 */
export const getStockDividendTool: BuiltInTool = {
    name: "get_stock_dividend",
    description: "获取股票历年分红派息数据，包括分红金额、派息比例、股息率、除权除息日等",
  category: 'stock',
    inputSchema: {
        type: "object",
        properties: {
            symbol: {
                type: "string",
                description: "股票代码，如'600000'(浦发银行)"
            },
            start_year: {
                type: "string",
                description: "起始年份，如'2020'"
            },
            end_year: {
                type: "string",
                description: "结束年份，如'2024'"
            }
        },
        required: ["symbol"]
    },
    execute: async ({ symbol, start_year, end_year }) => {
        try {
            const response = await requestUrl({
                url: `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_SHAREBONUS_DET&columns=ALL&filter=(SECURITY_CODE="${symbol}")&pageNumber=1&pageSize=100&sortTypes=-1&sortColumns=REPORT_DATE`,
                method: "GET"
            });
            
            if (response.json && response.json.result && response.json.result.data) {
                const dividends = response.json.result.data;
                let filteredData = dividends;
                
                if (start_year || end_year) {
                    filteredData = dividends.filter((d: any) => {
                        const year = d.REPORT_DATE ? d.REPORT_DATE.substring(0, 4) : '';
                        if (start_year && year < start_year) return false;
                        if (end_year && year > end_year) return false;
                        return true;
                    });
                }
                
                return JSON.stringify({
                    symbol: symbol,
                    total_count: filteredData.length,
                    dividends: filteredData
                }, null, 2);
            }
            return '暂无分红数据';
        } catch (error) {
            return `获取分红数据失败: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
};

/**
 * 股票回购数据 - Stock Buyback Data
 * 获取上市公司股票回购信息
 */
export const getStockBuybackTool: BuiltInTool = {
    name: "get_stock_buyback",
    description: "获取股票回购数据，包括回购方案、回购进展、回购金额、回购股份数量等",
  category: 'stock',
    inputSchema: {
        type: "object",
        properties: {
            symbol: {
                type: "string",
                description: "股票代码，留空返回所有回购公告"
            },
            status: {
                type: "string",
                description: "回购状态: 'plan'(回购方案), 'progress'(回购进展), 'completed'(回购完成)"
            },
            start_date: {
                type: "string",
                description: "起始日期 YYYY-MM-DD"
            },
            end_date: {
                type: "string",
                description: "结束日期 YYYY-MM-DD"
            }
        },
        required: []
    },
    execute: async ({ symbol, status, start_date, end_date }) => {
        try {
            let filter = '';
            if (symbol) filter = `(SECURITY_CODE="${symbol}")`;
            if (start_date && end_date) {
                filter += filter ? ' and ' : '';
                filter += `(NOTICE_DATE>="${start_date}" and NOTICE_DATE<="${end_date}")`;
            }
            
            const response = await requestUrl({
                url: `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_SHARE_REPURCHASE&columns=ALL&filter=${filter}&pageNumber=1&pageSize=100&sortTypes=-1&sortColumns=NOTICE_DATE`,
                method: "GET"
            });
            
            if (response.json && response.json.result && response.json.result.data) {
                return JSON.stringify({
                    total: response.json.result.count,
                    buybacks: response.json.result.data
                }, null, 2);
            }
            return '暂无回购数据';
        } catch (error) {
            return `获取回购数据失败: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
};

/**
 * 高管交易数据 - Executive Trading Data
 * 获取上市公司高管增减持数据
 */
export const getExecutiveTradingTool: BuiltInTool = {
    name: "get_executive_trading",
    description: "获取上市公司高管、董事、监事的增减持数据，包括交易时间、交易价格、交易数量等",
  category: 'market-data',
    inputSchema: {
        type: "object",
        properties: {
            symbol: {
                type: "string",
                description: "股票代码"
            },
            trade_type: {
                type: "string",
                description: "交易类型: 'increase'(增持), 'decrease'(减持)"
            },
            start_date: {
                type: "string",
                description: "起始日期 YYYY-MM-DD"
            },
            end_date: {
                type: "string",
                description: "结束日期 YYYY-MM-DD"
            }
        },
        required: []
    },
    execute: async ({ symbol, trade_type, start_date, end_date }) => {
        try {
            let filter = '';
            if (symbol) filter = `(SECURITY_CODE="${symbol}")`;
            if (trade_type) {
                const typeMap: any = { increase: '增持', decrease: '减持' };
                filter += filter ? ' and ' : '';
                filter += `(CHANGE_TYPE="${typeMap[trade_type]}")`;
            }
            if (start_date && end_date) {
                filter += filter ? ' and ' : '';
                filter += `(CHANGE_DATE>="${start_date}" and CHANGE_DATE<="${end_date}")`;
            }
            
            const response = await requestUrl({
                url: `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_EXECUTIVE_HOLD_DETAILS&columns=ALL&filter=${filter}&pageNumber=1&pageSize=100&sortTypes=-1&sortColumns=CHANGE_DATE`,
                method: "GET"
            });
            
            if (response.json && response.json.result && response.json.result.data) {
                return JSON.stringify({
                    total: response.json.result.count,
                    executive_trades: response.json.result.data
                }, null, 2);
            }
            return '暂无高管交易数据';
        } catch (error) {
            return `获取高管交易失败: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
};

/**
 * 机构持仓数据 - Institutional Holdings
 * 获取机构投资者持仓数据
 */
export const getInstitutionalHoldingsTool: BuiltInTool = {
    name: "get_institutional_holdings",
    description: "获取机构持仓数据，包括基金、QFII、社保、券商、保险等机构的持股情况",
  category: 'market-data',
    inputSchema: {
        type: "object",
        properties: {
            symbol: {
                type: "string",
                description: "股票代码"
            },
            institution_type: {
                type: "string",
                description: "机构类型: 'fund'(基金), 'qfii'(QFII), 'social_security'(社保), 'broker'(券商), 'insurance'(保险)"
            },
            report_period: {
                type: "string",
                description: "报告期，如'2024-03-31'(季度末)"
            }
        },
        required: ["symbol"]
    },
    execute: async ({ symbol, institution_type, report_period }) => {
        try {
            let filter = `(SECURITY_CODE="${symbol}")`;
            if (report_period) {
                filter += ` and (REPORT_DATE="${report_period}")`;
            }
            
            const response = await requestUrl({
                url: `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_INSTITUTIONAL_HOLDING&columns=ALL&filter=${filter}&pageNumber=1&pageSize=100&sortTypes=-1&sortColumns=REPORT_DATE`,
                method: "GET"
            });
            
            if (response.json && response.json.result && response.json.result.data) {
                let holdings = response.json.result.data;
                
                if (institution_type) {
                    const typeMap: any = {
                        fund: '基金',
                        qfii: 'QFII',
                        social_security: '社保',
                        broker: '券商',
                        insurance: '保险'
                    };
                    holdings = holdings.filter((h: any) => 
                        h.HOLDER_TYPE && h.HOLDER_TYPE.includes(typeMap[institution_type])
                    );
                }
                
                return JSON.stringify({
                    symbol: symbol,
                    report_period: report_period || '最新',
                    institution_type: institution_type || '全部',
                    holdings: holdings
                }, null, 2);
            }
            return '暂无机构持仓数据';
        } catch (error) {
            return `获取机构持仓失败: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
};

/**
 * 股东人数变化 - Shareholder Count Changes
 * 获取股东人数及户均持股变化数据
 */
export const getShareholderCountTool: BuiltInTool = {
    name: "get_shareholder_count",
    description: "获取股东人数变化，包括总股东数、户均持股、较上期变化等，可分析筹码集中度",
  category: 'market-data',
    inputSchema: {
        type: "object",
        properties: {
            symbol: {
                type: "string",
                description: "股票代码"
            },
            start_date: {
                type: "string",
                description: "起始日期 YYYY-MM-DD"
            },
            end_date: {
                type: "string",
                description: "结束日期 YYYY-MM-DD"
            }
        },
        required: ["symbol"]
    },
    execute: async ({ symbol, start_date, end_date }) => {
        try {
            let filter = `(SECURITY_CODE="${symbol}")`;
            if (start_date && end_date) {
                filter += ` and (END_DATE>="${start_date}" and END_DATE<="${end_date}")`;
            }
            
            const response = await requestUrl({
                url: `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_HOLDERNUM_DET&columns=ALL&filter=${filter}&pageNumber=1&pageSize=50&sortTypes=-1&sortColumns=END_DATE`,
                method: "GET"
            });
            
            if (response.json && response.json.result && response.json.result.data) {
                const data = response.json.result.data;
                // 计算筹码集中度变化趋势
                const trend = data.length >= 2 ? 
                    (data[0].HOLDER_NUM < data[1].HOLDER_NUM ? '股东人数减少，筹码集中' : '股东人数增加，筹码分散') 
                    : '数据不足';
                
                return JSON.stringify({
                    symbol: symbol,
                    trend: trend,
                    latest_count: data[0]?.HOLDER_NUM,
                    avg_holding: data[0]?.AVG_HOLD_AMT,
                    history: data
                }, null, 2);
            }
            return '暂无股东人数数据';
        } catch (error) {
            return `获取股东人数失败: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
};

/**
 * 限售股解禁 - Restricted Share Release
 * 获取限售股解禁计划和历史数据
 */
export const getRestrictedShareReleaseTool: BuiltInTool = {
    name: "get_restricted_share_release",
    description: "获取限售股解禁数据，包括解禁时间、解禁数量、解禁市值、限售股类型等",
  category: 'market-data',
    inputSchema: {
        type: "object",
        properties: {
            symbol: {
                type: "string",
                description: "股票代码，留空返回所有解禁计划"
            },
            start_date: {
                type: "string",
                description: "起始日期 YYYY-MM-DD"
            },
            end_date: {
                type: "string",
                description: "结束日期 YYYY-MM-DD"
            },
            min_market_value: {
                type: "number",
                description: "最小解禁市值（亿元），筛选大额解禁"
            }
        },
        required: []
    },
    execute: async ({ symbol, start_date, end_date, min_market_value }) => {
        try {
            let filter = '';
            if (symbol) filter = `(SECURITY_CODE="${symbol}")`;
            if (start_date && end_date) {
                filter += filter ? ' and ' : '';
                filter += `(LIFT_DATE>="${start_date}" and LIFT_DATE<="${end_date}")`;
            }
            
            const response = await requestUrl({
                url: `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_LIFT_STAGE&columns=ALL&filter=${filter}&pageNumber=1&pageSize=100&sortTypes=1&sortColumns=LIFT_DATE`,
                method: "GET"
            });
            
            if (response.json && response.json.result && response.json.result.data) {
                let releases = response.json.result.data;
                
                if (min_market_value) {
                    releases = releases.filter((r: any) => 
                        (r.LIFT_MARKET_CAP || 0) / 100000000 >= min_market_value
                    );
                }
                
                return JSON.stringify({
                    total: releases.length,
                    min_market_value: min_market_value || '无限制',
                    releases: releases
                }, null, 2);
            }
            return '暂无解禁数据';
        } catch (error) {
            return `获取解禁数据失败: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
};

/**
 * 股权质押数据 - Share Pledge Data
 * 获取股权质押信息
 */
export const getSharePledgeTool: BuiltInTool = {
    name: "get_share_pledge",
    description: "获取股权质押数据，包括质押股东、质押数量、质押比例、质押开始结束日期等",
  category: 'market-data',
    inputSchema: {
        type: "object",
        properties: {
            symbol: {
                type: "string",
                description: "股票代码"
            },
            status: {
                type: "string",
                description: "质押状态: 'active'(质押中), 'released'(已解除)"
            }
        },
        required: ["symbol"]
    },
    execute: async ({ symbol, status }) => {
        try {
            let filter = `(SECURITY_CODE="${symbol}")`;
            if (status === 'active') {
                filter += ` and (PLEDGE_STATUS="质押")`;
            } else if (status === 'released') {
                filter += ` and (PLEDGE_STATUS="解除质押")`;
            }
            
            const response = await requestUrl({
                url: `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_SHARE_PLEDGE_DETAIL&columns=ALL&filter=${filter}&pageNumber=1&pageSize=100&sortTypes=-1&sortColumns=PLEDGE_DATE`,
                method: "GET"
            });
            
            if (response.json && response.json.result && response.json.result.data) {
                const pledges = response.json.result.data;
                const totalPledgeRatio = pledges.reduce((sum: number, p: any) => 
                    sum + (p.PLEDGE_RATIO || 0), 0
                );
                
                return JSON.stringify({
                    symbol: symbol,
                    status: status || '全部',
                    total_pledge_ratio: totalPledgeRatio.toFixed(2) + '%',
                    pledge_count: pledges.length,
                    pledges: pledges
                }, null, 2);
            }
            return '暂无质押数据';
        } catch (error) {
            return `获取质押数据失败: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
};

/**
 * 股票增发数据 - Stock Offering Data
 * 获取股票增发（定增、配股、公开增发）信息
 */
export const getStockOfferingTool: BuiltInTool = {
    name: "get_stock_offering",
    description: "获取股票增发数据，包括定向增发、配股、公开增发的预案、实施进展等",
  category: 'stock',
    inputSchema: {
        type: "object",
        properties: {
            symbol: {
                type: "string",
                description: "股票代码，留空返回所有增发公告"
            },
            offering_type: {
                type: "string",
                description: "增发类型: 'private'(定向增发), 'rights'(配股), 'public'(公开增发)"
            },
            status: {
                type: "string",
                description: "状态: 'plan'(预案), 'approved'(已批准), 'completed'(已完成)"
            }
        },
        required: []
    },
    execute: async ({ symbol, offering_type, status }) => {
        try {
            let filter = '';
            if (symbol) filter = `(SECURITY_CODE="${symbol}")`;
            
            const response = await requestUrl({
                url: `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_STOCK_OFFERING&columns=ALL&filter=${filter}&pageNumber=1&pageSize=100&sortTypes=-1&sortColumns=NOTICE_DATE`,
                method: "GET"
            });
            
            if (response.json && response.json.result && response.json.result.data) {
                let offerings = response.json.result.data;
                
                if (offering_type) {
                    const typeMap: any = {
                        private: '定向增发',
                        rights: '配股',
                        public: '公开增发'
                    };
                    offerings = offerings.filter((o: any) => 
                        o.OFFERING_TYPE && o.OFFERING_TYPE.includes(typeMap[offering_type])
                    );
                }
                
                return JSON.stringify({
                    total: offerings.length,
                    offerings: offerings
                }, null, 2);
            }
            return '暂无增发数据';
        } catch (error) {
            return `获取增发数据失败: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
};

/**
 * 股权激励数据 - Equity Incentive Data
 * 获取股权激励计划信息
 */
export const getEquityIncentiveTool: BuiltInTool = {
    name: "get_equity_incentive",
    description: "获取股权激励数据，包括激励方案、授予价格、行权条件、解锁进度等",
  category: 'market-data',
    inputSchema: {
        type: "object",
        properties: {
            symbol: {
                type: "string",
                description: "股票代码"
            },
            incentive_type: {
                type: "string",
                description: "激励类型: 'option'(股票期权), 'restricted'(限制性股票), 'espp'(员工持股计划)"
            }
        },
        required: []
    },
    execute: async ({ symbol, incentive_type }) => {
        try {
            let filter = '';
            if (symbol) filter = `(SECURITY_CODE="${symbol}")`;
            
            const response = await requestUrl({
                url: `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_EQUITY_INCENTIVE&columns=ALL&filter=${filter}&pageNumber=1&pageSize=50&sortTypes=-1&sortColumns=NOTICE_DATE`,
                method: "GET"
            });
            
            if (response.json && response.json.result && response.json.result.data) {
                return JSON.stringify({
                    symbol: symbol || '全部',
                    incentive_type: incentive_type || '全部',
                    plans: response.json.result.data
                }, null, 2);
            }
            return '暂无股权激励数据';
        } catch (error) {
            return `获取股权激励失败: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
};

/**
 * 业绩预告数据 - Earnings Forecast
 * 获取上市公司业绩预告
 */
export const getEarningsForecastTool: BuiltInTool = {
    name: "get_earnings_forecast",
    description: "获取业绩预告数据，包括预增、预减、扭亏、首亏等业绩变动情况",
  category: 'market-data',
    inputSchema: {
        type: "object",
        properties: {
            symbol: {
                type: "string",
                description: "股票代码，留空返回所有业绩预告"
            },
            forecast_type: {
                type: "string",
                description: "预告类型: 'increase'(预增), 'decrease'(预减), 'profit'(扭亏), 'loss'(首亏), 'continue_profit'(续盈), 'continue_loss'(续亏)"
            },
            report_period: {
                type: "string",
                description: "报告期，如'2024-12-31'"
            }
        },
        required: []
    },
    execute: async ({ symbol, forecast_type, report_period }) => {
        try {
            let filter = '';
            if (symbol) filter = `(SECURITY_CODE="${symbol}")`;
            if (report_period) {
                filter += filter ? ' and ' : '';
                filter += `(REPORT_DATE="${report_period}")`;
            }
            if (forecast_type) {
                const typeMap: any = {
                    increase: '预增',
                    decrease: '预减',
                    profit: '扭亏',
                    loss: '首亏',
                    continue_profit: '续盈',
                    continue_loss: '续亏'
                };
                filter += filter ? ' and ' : '';
                filter += `(FORECAST_TYPE="${typeMap[forecast_type]}")`;
            }
            
            const response = await requestUrl({
                url: `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_PUBLIC_OP_NEWPREDICT&columns=ALL&filter=${filter}&pageNumber=1&pageSize=100&sortTypes=-1&sortColumns=NOTICE_DATE`,
                method: "GET"
            });
            
            if (response.json && response.json.result && response.json.result.data) {
                return JSON.stringify({
                    total: response.json.result.count,
                    forecasts: response.json.result.data
                }, null, 2);
            }
            return '暂无业绩预告';
        } catch (error) {
            return `获取业绩预告失败: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
};

/**
 * 业绩快报数据 - Earnings Flash
 * 获取上市公司业绩快报
 */
export const getEarningsFlashTool: BuiltInTool = {
    name: "get_earnings_flash",
    description: "获取业绩快报数据，比正式年报提前披露主要财务指标",
  category: 'market-data',
    inputSchema: {
        type: "object",
        properties: {
            symbol: {
                type: "string",
                description: "股票代码"
            },
            report_period: {
                type: "string",
                description: "报告期，如'2024-12-31'"
            }
        },
        required: []
    },
    execute: async ({ symbol, report_period }) => {
        try {
            let filter = '';
            if (symbol) filter = `(SECURITY_CODE="${symbol}")`;
            if (report_period) {
                filter += filter ? ' and ' : '';
                filter += `(REPORT_DATE="${report_period}")`;
            }
            
            const response = await requestUrl({
                url: `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_LICO_FN_CPD&columns=ALL&filter=${filter}&pageNumber=1&pageSize=100&sortTypes=-1&sortColumns=NOTICE_DATE`,
                method: "GET"
            });
            
            if (response.json && response.json.result && response.json.result.data) {
                return JSON.stringify({
                    symbol: symbol || '全部',
                    report_period: report_period || '最新',
                    flash_reports: response.json.result.data
                }, null, 2);
            }
            return '暂无业绩快报';
        } catch (error) {
            return `获取业绩快报失败: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
};

/**
 * 龙虎榜数据 - Top List Data
 * 获取龙虎榜上榜股票及营业部席位数据
 */
export const getTopListTool: BuiltInTool = {
    name: "get_top_list",
    description: "获取龙虎榜数据，包括上榜原因、买卖前五席位、机构买卖情况等",
  category: 'market-data',
    inputSchema: {
        type: "object",
        properties: {
            symbol: {
                type: "string",
                description: "股票代码，留空返回当日所有龙虎榜"
            },
            trade_date: {
                type: "string",
                description: "交易日期 YYYY-MM-DD"
            },
            reason: {
                type: "string",
                description: "上榜原因关键词，如'涨停', '跌停', '换手率'"
            }
        },
        required: []
    },
    execute: async ({ symbol, trade_date, reason }) => {
        try {
            let filter = '';
            if (symbol) filter = `(SECURITY_CODE="${symbol}")`;
            if (trade_date) {
                filter += filter ? ' and ' : '';
                filter += `(TRADE_DATE="${trade_date}")`;
            }
            
            const response = await requestUrl({
                url: `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_BILLBOARD_DAILYDETAILS&columns=ALL&filter=${filter}&pageNumber=1&pageSize=100&sortTypes=-1&sortColumns=TRADE_DATE`,
                method: "GET"
            });
            
            if (response.json && response.json.result && response.json.result.data) {
                let topList = response.json.result.data;
                
                if (reason) {
                    topList = topList.filter((t: any) => 
                        t.EXPLANATION && t.EXPLANATION.includes(reason)
                    );
                }
                
                return JSON.stringify({
                    total: topList.length,
                    date: trade_date || '最新',
                    top_list: topList
                }, null, 2);
            }
            return '暂无龙虎榜数据';
        } catch (error) {
            return `获取龙虎榜失败: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
};
