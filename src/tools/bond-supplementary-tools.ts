import { BuiltInTool } from './built-in-tools';
import { requestUrl } from 'obsidian';

/**
 * 可转债实时行情 - Convertible Bond Spot Quotes
 * 获取沪深可转债的实时行情数据
 */
export const getConvertibleBondSpotTool: BuiltInTool = {
    name: "get_convertible_bond_spot",
    description: "获取沪深可转债实时行情数据，包括价格、涨跌、成交量、转股溢价率等信息",
  category: 'bonds',
    inputSchema: {
        type: "object",
        properties: {
            symbol: {
                type: "string",
                description: "可转债代码，如 '113050'(南银转债)，留空返回全部"
            }
        },
        required: []
    },
    execute: async ({ symbol }) => {
        try {
            const params = new URLSearchParams();
            if (symbol) params.append('symbol', symbol);
            
            const response = await requestUrl({
                url: `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_BOND_CB_LIST&columns=ALL&quoteColumns=&filter=&pageNumber=1&pageSize=500&sortTypes=-1&sortColumns=TRADE_DATE&source=WEB`,
                method: "GET"
            });
            
            if (response.json && response.json.result) {
                const data = response.json.result.data || [];
                if (symbol) {
                    const item = data.find((d: any) => d.BOND_CODE === symbol);
                    return item ? JSON.stringify(item, null, 2) : '未找到该转债';
                }
                return JSON.stringify(data.slice(0, 20), null, 2);
            }
            return '暂无数据';
        } catch (error) {
            return `获取可转债行情失败: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
};

/**
 * 公司债实时行情 - Corporate Bond Spot Quotes
 * 获取公司债券的实时行情数据
 */
export const getCorporateBondSpotTool: BuiltInTool = {
    name: "get_corporate_bond_spot",
    description: "获取公司债实时行情，包括价格、收益率、成交量等",
  category: 'bonds',
    inputSchema: {
        type: "object",
        properties: {
            market: {
                type: "string",
                description: "市场: 'sh'(上交所) 或 'sz'(深交所)，默认全部"
            }
        },
        required: []
    },
    execute: async ({ market }) => {
        try {
            const marketFilter = market ? `(MARKET="${market.toUpperCase()}")` : '';
            
            const response = await requestUrl({
                url: `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_BOND_CORPORATE&columns=ALL&filter=${marketFilter}&pageNumber=1&pageSize=100&sortTypes=-1&sortColumns=TRADE_DATE`,
                method: "GET"
            });
            
            if (response.json && response.json.result && response.json.result.data) {
                return JSON.stringify(response.json.result.data, null, 2);
            }
            return '暂无数据';
        } catch (error) {
            return `获取公司债行情失败: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
};

/**
 * 公司债发行信息 - Corporate Bond Issuance
 * 获取公司债的发行详情
 */
export const getCorporateBondIssuanceTool: BuiltInTool = {
    name: "get_corporate_bond_issuance",
    description: "获取公司债发行信息，包括发行人、规模、期限、利率、信用评级等",
  category: 'bonds',
    inputSchema: {
        type: "object",
        properties: {
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
    execute: async ({ start_date, end_date }) => {
        try {
            let filter = '';
            if (start_date && end_date) {
                filter = `(ISSUE_DATE>="${start_date}" and ISSUE_DATE<="${end_date}")`;
            }
            
            const response = await requestUrl({
                url: `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_BOND_ISSUE&columns=ALL&filter=${filter}&pageNumber=1&pageSize=100&sortTypes=-1&sortColumns=ISSUE_DATE`,
                method: "GET"
            });
            
            if (response.json && response.json.result && response.json.result.data) {
                return JSON.stringify(response.json.result.data, null, 2);
            }
            return '暂无数据';
        } catch (error) {
            return `获取公司债发行信息失败: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
};

/**
 * 地方政府债发行 - Local Government Bond Issuance
 * 获取地方政府债券的发行信息
 */
export const getLocalGovBondIssuanceTool: BuiltInTool = {
    name: "get_local_gov_bond_issuance",
    description: "获取地方政府债券发行数据，包括一般债券和专项债券",
  category: 'bonds',
    inputSchema: {
        type: "object",
        properties: {
            province: {
                type: "string",
                description: "省份名称，如'浙江'，留空返回全部"
            },
            bond_type: {
                type: "string",
                description: "债券类型: 'general'(一般债) 或 'special'(专项债)"
            }
        },
        required: []
    },
    execute: async ({ province, bond_type }) => {
        try {
            let filter = '';
            if (province) filter += `(PROVINCE="${province}")`;
            if (bond_type) {
                const typeMap: any = { general: '一般债券', special: '专项债券' };
                filter += filter ? ' and ' : '';
                filter += `(BOND_TYPE="${typeMap[bond_type]}")`;
            }
            
            const response = await requestUrl({
                url: `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_BOND_LOCAL_GOV&columns=ALL&filter=${filter}&pageNumber=1&pageSize=100`,
                method: "GET"
            });
            
            if (response.json && response.json.result && response.json.result.data) {
                return JSON.stringify(response.json.result.data, null, 2);
            }
            return '暂无数据';
        } catch (error) {
            return `获取地方债发行信息失败: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
};

/**
 * 债券信用评级 - Bond Credit Rating
 * 获取债券的信用评级信息
 */
export const getBondCreditRatingTool: BuiltInTool = {
    name: "get_bond_credit_rating",
    description: "获取债券信用评级，包括主体评级、债项评级、评级机构、评级展望等",
  category: 'bonds',
    inputSchema: {
        type: "object",
        properties: {
            symbol: {
                type: "string",
                description: "债券代码"
            },
            issuer: {
                type: "string",
                description: "发行人名称"
            }
        },
        required: []
    },
    execute: async ({ symbol, issuer }) => {
        try {
            let filter = '';
            if (symbol) filter = `(BOND_CODE="${symbol}")`;
            else if (issuer) filter = `(ISSUER_NAME like "%${issuer}%")`;
            
            const response = await requestUrl({
                url: `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_BOND_RATING&columns=ALL&filter=${filter}&pageNumber=1&pageSize=50`,
                method: "GET"
            });
            
            if (response.json && response.json.result && response.json.result.data) {
                return JSON.stringify(response.json.result.data, null, 2);
            }
            return '暂无数据';
        } catch (error) {
            return `获取信用评级失败: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
};

/**
 * 债券评级调整 - Bond Rating Changes
 * 获取债券评级调整信息
 */
export const getBondRatingChangesTool: BuiltInTool = {
    name: "get_bond_rating_changes",
    description: "获取债券评级调整记录，包括上调、下调、展望调整等",
  category: 'bonds',
    inputSchema: {
        type: "object",
        properties: {
            start_date: {
                type: "string",
                description: "起始日期 YYYY-MM-DD"
            },
            end_date: {
                type: "string",
                description: "结束日期 YYYY-MM-DD"
            },
            change_type: {
                type: "string",
                description: "调整类型: 'upgrade'(上调), 'downgrade'(下调), 'outlook'(展望调整)"
            }
        },
        required: []
    },
    execute: async ({ start_date, end_date, change_type }) => {
        try {
            let filter = '';
            if (start_date && end_date) {
                filter = `(RATING_DATE>="${start_date}" and RATING_DATE<="${end_date}")`;
            }
            if (change_type) {
                const typeMap: any = {
                    upgrade: '上调',
                    downgrade: '下调',
                    outlook: '展望调整'
                };
                filter += filter ? ' and ' : '';
                filter += `(CHANGE_TYPE="${typeMap[change_type]}")`;
            }
            
            const response = await requestUrl({
                url: `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_BOND_RATING_CHANGE&columns=ALL&filter=${filter}&pageNumber=1&pageSize=100&sortTypes=-1&sortColumns=RATING_DATE`,
                method: "GET"
            });
            
            if (response.json && response.json.result && response.json.result.data) {
                return JSON.stringify(response.json.result.data, null, 2);
            }
            return '暂无数据';
        } catch (error) {
            return `获取评级调整失败: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
};

/**
 * 债券违约事件 - Bond Default Events
 * 获取债券违约事件信息
 */
export const getBondDefaultEventsTool: BuiltInTool = {
    name: "get_bond_default_events",
    description: "获取债券违约事件，包括技术性违约、实质性违约、兑付延迟等",
  category: 'bonds',
    inputSchema: {
        type: "object",
        properties: {
            year: {
                type: "string",
                description: "年份，如 '2024'"
            },
            default_type: {
                type: "string",
                description: "违约类型: 'technical'(技术性), 'substantive'(实质性), 'delay'(延迟兑付)"
            }
        },
        required: []
    },
    execute: async ({ year, default_type }) => {
        try {
            let filter = '';
            if (year) {
                filter = `(DEFAULT_DATE like "${year}%")`;
            }
            
            const response = await requestUrl({
                url: `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_BOND_DEFAULT&columns=ALL&filter=${filter}&pageNumber=1&pageSize=100&sortTypes=-1&sortColumns=DEFAULT_DATE`,
                method: "GET"
            });
            
            if (response.json && response.json.result && response.json.result.data) {
                const data = response.json.result.data;
                return JSON.stringify({
                    total_count: data.length,
                    events: data
                }, null, 2);
            }
            return '暂无违约事件';
        } catch (error) {
            return `获取违约事件失败: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
};


