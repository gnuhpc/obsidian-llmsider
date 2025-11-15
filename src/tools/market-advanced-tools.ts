// Market Advanced Tools - Limit boards, money flow, dragon-tiger list, new stocks
import { BuiltInTool } from './built-in-tools';
import { Logger } from './../utils/logger';
import { requestUrl } from 'obsidian';

/**
 * 高级市场工具
 * 包括涨跌停板、飙升榜、资金流向、龙虎榜、新股申购、股东持股等高级数据
 */

// ==================== 涨跌停板工具 ====================

interface LimitBoardResponse {
    data: {
        diff: Array<{
            f12: string;     // 股票代码
            f14: string;     // 股票名称
            f2: number;      // 最新价
            f3: number;      // 涨跌幅
            f5: number;      // 成交量
            f6: number;      // 成交额
            f15: number;     // 最高价
            f16: number;     // 最低价
            f8: number;      // 换手率
            f10: number;     // 量比
            f20: number;     // 总市值
            f23: number;     // 打板次数/封单金额
        }>;
    };
}

/**
 * 获取涨跌停板数据
 */
async function getLimitBoard(type: string = 'up'): Promise<string> {
    try {
        const url = 'https://push2.eastmoney.com/api/qt/clist/get';
        
        // 板块类型映射
        const typeMap: { [key: string]: string } = {
            'up': 'm:0 t:6 f:!2,m:0 t:80 f:!2,m:1 t:6 f:!2,m:1 t:80 f:!2',     // 涨停板
            'down': 'm:0 t:6 f:!2,m:0 t:80 f:!2,m:1 t:6 f:!2,m:1 t:80 f:!2',   // 跌停板（涨跌幅为负）
            'strong': 'm:0+t:6+f:!2,m:0+t:80+f:!2,m:1+t:6+f:!2,m:1+t:80+f:!2'  // 强势股（涨幅>7%）
        };
        
        let fs = typeMap['up'];
        let sortField = 'f3';  // 按涨跌幅排序
        
        const params = new URLSearchParams({
            pn: '1',
            pz: '200',
            po: '1',
            np: '1',
            ut: 'bd1d9ddb04089700cf9c27f6f7426281',
            fltt: '2',
            invt: '2',
            fid: sortField,
            fs: fs,
            fields: 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f22,f11,f62,f128,f136,f115,f152'
        });

        const response = await requestUrl({
            url: `${url}?${params.toString()}`,
            method: 'GET'
        });

        const data: LimitBoardResponse = response.json;
        
        if (!data.data?.diff || data.data.diff.length === 0) {
            return `❌ 未获取到${type === 'up' ? '涨停板' : type === 'down' ? '跌停板' : '强势股'}数据`;
        }

        // 根据类型筛选数据
        let stocks = data.data.diff;
        if (type === 'up') {
            stocks = stocks.filter(s => (s.f3 || 0) >= 9.9);  // 涨幅>=9.9%
        } else if (type === 'down') {
            stocks = stocks.filter(s => (s.f3 || 0) <= -9.9);  // 跌幅<=-9.9%
        } else if (type === 'strong') {
            stocks = stocks.filter(s => (s.f3 || 0) >= 7 && (s.f3 || 0) < 9.9);  // 7% <= 涨幅 < 9.9%
        }

        if (stocks.length === 0) {
            return `📊 当前暂无${type === 'up' ? '涨停' : type === 'down' ? '跌停' : '强势'}股票`;
        }

        // 格式化输出
        const title = type === 'up' ? '📈 涨停板' : type === 'down' ? '📉 跌停板' : '💪 强势股';
        let output = `${title} (共 ${stocks.length} 只股票)\n\n`;
        output += '| 代码 | 名称 | 最新价 | 涨跌幅 | 成交额 | 换手率 | 量比 | 总市值 |\n';
        output += '|------|------|--------|--------|--------|--------|------|--------|\n';
        
        stocks.slice(0, 50).forEach(stock => {
            const price = (stock.f2 || 0) / 100;
            const change = (stock.f3 || 0) / 100;
            const amount = formatMarketCapShort(stock.f6);
            const turnover = (stock.f8 || 0) / 100;
            const ratio = (stock.f10 || 0) / 100;
            const marketCap = formatMarketCapShort(stock.f20);
            
            output += `| ${stock.f12} | ${stock.f14} | ${price.toFixed(2)} | ${change.toFixed(2)}% | ${amount} | ${turnover.toFixed(2)}% | ${ratio.toFixed(2)} | ${marketCap} |\n`;
        });

        if (stocks.length > 50) {
            output += `\n... 还有 ${stocks.length - 50} 只股票未显示`;
        }

        return output;

    } catch (error) {
        Logger.error('获取涨跌停板数据失败:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `❌ 获取涨跌停板数据失败: ${errorMessage}`;
    }
}

function formatMarketCapShort(value: number): string {
    if (!value || isNaN(value)) return 'N/A';
    const yi = 100000000;
    if (value >= yi) {
        return `${(value / yi).toFixed(2)}亿`;
    }
    return `${(value / 10000).toFixed(2)}万`;
}

export const getLimitBoardTool: BuiltInTool = {
    name: 'get_limit_board',
    description: 'Get stocks hitting daily limit (up/down limit) or strong stocks with significant price changes. Shows limit boards, strong stocks (gain > 7%), turnover, and trading volume.',
    inputSchema: {
        type: 'object',
        properties: {
            type: {
                type: 'string',
                description: 'Board type: "up" (stocks hitting upper limit, ~10%), "down" (stocks hitting lower limit, ~-10%), "strong" (strong stocks with 7-10% gain)',
                enum: ['up', 'down', 'strong'],
                default: 'up'
            }
        },
        required: []
    },
    execute: async (input: { type?: string }) => {
        const type = input.type || 'up';
        return await getLimitBoard(type);
    }
};

// ==================== 市场资金流向工具 ====================

interface MarketMoneyFlowResponse {
    data: {
        diff: Array<{
            f12: string;     // 代码
            f14: string;     // 名称
            f2: number;      // 最新价
            f3: number;      // 涨跌幅
            f62: number;     // 主力净流入
            f184: number;    // 主力净流入占比
            f66: number;     // 超大单净流入
            f69: number;     // 大单净流入
            f72: number;     // 中单净流入
            f75: number;     // 小单净流入
            f78: number;     // 主力净占比
        }>;
    };
}

/**
 * 获取市场资金流向
 */
async function getMarketMoneyFlow(sortBy: string = 'main', limit: number = 50): Promise<string> {
    try {
        const url = 'https://push2.eastmoney.com/api/qt/clist/get';
        
        // 排序字段映射
        const sortFieldMap: { [key: string]: string } = {
            'main': 'f62',       // 主力净流入
            'super': 'f66',      // 超大单净流入
            'big': 'f69',        // 大单净流入
            'change': 'f3'       // 涨跌幅
        };
        
        const sortField = sortFieldMap[sortBy] || 'f62';
        
        const params = new URLSearchParams({
            pn: '1',
            pz: Math.min(limit, 200).toString(),
            po: '1',
            np: '1',
            ut: 'bd1d9ddb04089700cf9c27f6f7426281',
            fltt: '2',
            invt: '2',
            fid: sortField,
            fs: 'm:0+t:6,m:0+t:80,m:1+t:6,m:1+t:80',  // 沪深A股
            fields: 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f22,f11,f62,f128,f136,f115,f152,f124,f107,f104,f105,f140,f141,f207,f208,f209,f222,f184,f66,f69,f72,f75,f78,f81,f84,f87'
        });

        const response = await requestUrl({
            url: `${url}?${params.toString()}`,
            method: 'GET'
        });

        const data: MarketMoneyFlowResponse = response.json;
        
        if (!data.data?.diff || data.data.diff.length === 0) {
            return '❌ 未获取到资金流向数据';
        }

        const stocks = data.data.diff;

        // 格式化输出
        let output = `💰 **个股资金流向** (Top ${stocks.length})\n\n`;
        output += `排序方式: ${sortBy === 'main' ? '主力净流入' : sortBy === 'super' ? '超大单净流入' : sortBy === 'big' ? '大单净流入' : '涨跌幅'}\n\n`;
        output += '| 代码 | 名称 | 最新价 | 涨跌幅 | 主力净流入 | 超大单 | 大单 | 中单 | 小单 |\n';
        output += '|------|------|--------|--------|-----------|--------|------|------|------|\n';
        
        stocks.forEach(stock => {
            const changeEmoji = (stock.f3 || 0) >= 0 ? '📈' : '📉';
            const price = (stock.f2 || 0) / 100;
            const change = (stock.f3 || 0) / 100;
            const mainFlow = formatMoneyFlow(stock.f62);
            const superFlow = formatMoneyFlow(stock.f66);
            const bigFlow = formatMoneyFlow(stock.f69);
            const midFlow = formatMoneyFlow(stock.f72);
            const smallFlow = formatMoneyFlow(stock.f75);
            
            output += `| ${stock.f12} | ${stock.f14} | ${price.toFixed(2)} | ${changeEmoji} ${change.toFixed(2)}% | ${mainFlow} | ${superFlow} | ${bigFlow} | ${midFlow} | ${smallFlow} |\n`;
        });

        output += `\n💡 说明: 主力=超大单+大单，正值表示流入，负值表示流出`;

        return output;

    } catch (error) {
        Logger.error('获取资金流向失败:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `❌ 获取资金流向失败: ${errorMessage}`;
    }
}

function formatMoneyFlow(value: number): string {
    if (!value || isNaN(value)) return '0';
    const yi = 100000000;
    const wan = 10000;
    const absValue = Math.abs(value);
    const sign = value >= 0 ? '+' : '-';
    
    if (absValue >= yi) {
        return `${sign}${(absValue / yi).toFixed(2)}亿`;
    } else if (absValue >= wan) {
        return `${sign}${(absValue / wan).toFixed(2)}万`;
    }
    return `${sign}${absValue.toFixed(0)}`;
}

export const getMarketMoneyFlowTool: BuiltInTool = {
    name: 'get_market_money_flow',
    description: 'Get real-time money flow data for stocks, showing institutional and retail fund movements. Displays main force inflow/outflow, super large orders, big orders, medium orders, and small orders. Useful for analyzing fund movements.',
    inputSchema: {
        type: 'object',
        properties: {
            sort_by: {
                type: 'string',
                description: 'Sort by field: "main" (main force net inflow), "super" (super large order), "big" (big order), "change" (price change %)',
                enum: ['main', 'super', 'big', 'change'],
                default: 'main'
            },
            limit: {
                type: 'number',
                description: 'Number of stocks to return (1-200, default: 50)',
                default: 50
            }
        },
        required: []
    },
    execute: async (input: { sort_by?: string; limit?: number }) => {
        const sortBy = input.sort_by || 'main';
        const limit = Math.max(1, Math.min(input.limit || 50, 200));
        return await getMarketMoneyFlow(sortBy, limit);
    }
};

// ==================== 龙虎榜工具 ====================

interface DragonTigerResponse {
    data: {
        huutb?: Array<{
            SECURITY_CODE: string;
            SECURITY_NAME_ABBR: string;
            TRADE_DATE: string;
            CLOSE_PRICE: number;
            CHANGE_RATE: number;
            EXPLANATION: string;
            NET_AMOUNT: number;
            BUY_AMOUNT: number;
            SELL_AMOUNT: number;
        }>;
    };
}

/**
 * 获取龙虎榜数据
 */
async function getDragonTigerList(date?: string): Promise<string> {
    try {
        // 如果没有指定日期，使用今天
        const today = date || new Date().toISOString().split('T')[0].replace(/-/g, '');
        
        const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
        const params = new URLSearchParams({
            sortColumns: 'SECURITY_CODE',
            sortTypes: '1',
            pageSize: '50',
            pageNumber: '1',
            reportName: 'RPT_DAILYBILLBOARD_DETAILS',
            columns: 'ALL',
            filter: `(TRADE_DATE='${today}')`
        });

        const response = await requestUrl({
            url: `${url}?${params.toString()}`,
            method: 'GET'
        });

        const data: DragonTigerResponse = response.json;
        
        if (!data.data?.huutb || data.data.huutb.length === 0) {
            return `📊 ${today} 暂无龙虎榜数据\n\n💡 提示: 龙虎榜一般在交易日收盘后更新，请检查日期是否为交易日`;
        }

        const stocks = data.data.huutb;

        // 格式化输出
        let output = `🐉 **龙虎榜数据** (${today}，共 ${stocks.length} 只股票)\n\n`;
        output += '| 代码 | 名称 | 收盘价 | 涨跌幅 | 净买入额 | 买入额 | 卖出额 | 上榜原因 |\n';
        output += '|------|------|--------|--------|----------|--------|--------|----------|\n';
        
        stocks.forEach(stock => {
            const changeEmoji = (stock.CHANGE_RATE || 0) >= 0 ? '📈' : '📉';
            const netAmount = formatMoneyFlow(stock.NET_AMOUNT);
            const buyAmount = formatMoneyFlow(stock.BUY_AMOUNT);
            const sellAmount = formatMoneyFlow(stock.SELL_AMOUNT);
            const reason = (stock.EXPLANATION || '').substring(0, 20);
            
            output += `| ${stock.SECURITY_CODE} | ${stock.SECURITY_NAME_ABBR} | ${(stock.CLOSE_PRICE || 0).toFixed(2)} | ${changeEmoji} ${(stock.CHANGE_RATE || 0).toFixed(2)}% | ${netAmount} | ${buyAmount} | ${sellAmount} | ${reason}... |\n`;
        });

        output += `\n💡 说明: 龙虎榜记录异常波动股票的机构和游资席位买卖情况`;

        return output;

    } catch (error) {
        Logger.error('获取龙虎榜数据失败:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `❌ 获取龙虎榜数据失败: ${errorMessage}`;
    }
}

export const getDragonTigerListTool: BuiltInTool = {
    name: 'get_dragon_tiger_list',
    description: 'Get Dragon-Tiger list (daily billboard) showing stocks with exceptional trading activity and institutional seat transactions. Shows net buying, reasons for listing, and fund flows. Updated after market close.',
    inputSchema: {
        type: 'object',
        properties: {
            date: {
                type: 'string',
                description: 'Date in format YYYYMMDD (e.g., 20231201). If not provided, uses today. Note: Data is available only for trading days and updated after market close.'
            }
        },
        required: []
    },
    execute: async (input: { date?: string }) => {
        return await getDragonTigerList(input.date);
    }
};

// ==================== 新股申购工具 ====================

interface NewStockResponse {
    data: {
        diff?: Array<{
            f1: number;      // 市场标识
            f57: string;     // 股票代码
            f58: string;     // 股票名称
            f151: string;    // 申购日期
            f152: number;    // 发行价
            f154: number;    // 中签率
            f156: number;    // 上市日期
            f188: number;    // 发行市盈率
            f189: number;    // 发行量(万股)
        }>;
    };
}

/**
 * 获取新股申购信息
 */
async function getNewStockInfo(status: string = 'subscribe'): Promise<string> {
    try {
        let url = '';
        let title = '';
        
        if (status === 'subscribe') {
            // 待申购新股
            url = 'https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_MAINBOARD_LATESTPRICE&columns=ALL&sortColumns=APPLY_DATE&sortTypes=-1&pageSize=50&pageNumber=1&filter=(APPLY_DATE%3E%272023-01-01%27)';
            title = '📝 **新股申购日历**';
        } else {
            // 已上市新股
            url = 'https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_NEW_STOCK_GEM&columns=ALL&sortColumns=LISTING_DATE&sortTypes=-1&pageSize=50&pageNumber=1';
            title = '🎊 **新股上市数据**';
        }

        const response = await requestUrl({
            url: url,
            method: 'GET'
        });

        const data = response.json;
        
        if (!data.data?.diff || data.data.diff.length === 0) {
            return `❌ 暂无${status === 'subscribe' ? '新股申购' : '新股上市'}数据`;
        }

        const stocks = data.data.diff.slice(0, 30);

        // 格式化输出
        let output = `${title} (共 ${stocks.length} 只)\n\n`;
        
        if (status === 'subscribe') {
            output += '| 股票代码 | 股票名称 | 申购日期 | 发行价 | 发行市盈率 | 发行量(万股) |\n';
            output += '|----------|----------|----------|--------|-----------|-------------|\n';
            
            stocks.forEach((stock: any) => {
                output += `| ${stock.SECURITY_CODE || 'N/A'} | ${stock.SECURITY_NAME || 'N/A'} | ${stock.APPLY_DATE || 'N/A'} | ${(stock.ISSUE_PRICE || 0).toFixed(2)} | ${(stock.PE_RATIO || 0).toFixed(2)} | ${(stock.ONLINE_ISSUE_LWR || 0).toFixed(0)} |\n`;
            });
        } else {
            output += '| 股票代码 | 股票名称 | 上市日期 | 发行价 | 最新价 | 涨跌幅 | 中签率 |\n';
            output += '|----------|----------|----------|--------|--------|--------|--------|\n';
            
            stocks.forEach((stock: any) => {
                const change = stock.OPEN_CHANGE_RATE || 0;
                const changeEmoji = change >= 0 ? '📈' : '📉';
                output += `| ${stock.SECURITY_CODE || 'N/A'} | ${stock.SECURITY_NAME || 'N/A'} | ${stock.LISTING_DATE || 'N/A'} | ${(stock.ISSUE_PRICE || 0).toFixed(2)} | ${(stock.OPEN_PRICE || 0).toFixed(2)} | ${changeEmoji} ${change.toFixed(2)}% | ${(stock.ONLINE_LOTTERY_RATE || 0).toFixed(4)}% |\n`;
            });
        }

        return output;

    } catch (error) {
        Logger.error('获取新股信息失败:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `❌ 获取新股信息失败: ${errorMessage}`;
    }
}

export const getNewStockInfoTool: BuiltInTool = {
    name: 'get_new_stock_info',
    description: 'Get IPO (new stock) information including subscription calendar and newly listed stock performance. Shows issue price, P/E ratio, subscription dates, listing dates, and first-day performance.',
    inputSchema: {
        type: 'object',
        properties: {
            status: {
                type: 'string',
                description: 'Status: "subscribe" (upcoming IPO subscriptions), "listed" (recently listed stocks)',
                enum: ['subscribe', 'listed'],
                default: 'subscribe'
            }
        },
        required: []
    },
    execute: async (input: { status?: string }) => {
        const status = input.status || 'subscribe';
        return await getNewStockInfo(status);
    }
};

// ==================== A股市场总览工具 ====================

/**
 * 获取A股市场总览
 */
async function getMarketOverview(): Promise<string> {
    try {
        const url = 'https://push2.eastmoney.com/api/qt/clist/get';
        const params = new URLSearchParams({
            pn: '1',
            pz: '10000',
            po: '1',
            np: '1',
            ut: 'bd1d9ddb04089700cf9c27f6f7426281',
            fltt: '2',
            invt: '2',
            fid: 'f3',
            fs: 'm:0+t:6,m:0+t:80,m:1+t:6,m:1+t:80',
            fields: 'f1,f2,f3,f4,f5,f6,f12,f14'
        });

        const response = await requestUrl({
            url: `${url}?${params.toString()}`,
            method: 'GET'
        });

        const data = response.json;
        
        if (!data.data?.diff || data.data.diff.length === 0) {
            return '❌ 未获取到市场总览数据';
        }

        const stocks = data.data.diff;
        
        // 统计数据
        const total = stocks.length;
        const up = stocks.filter((s: any) => (s.f3 || 0) > 0).length;
        const down = stocks.filter((s: any) => (s.f3 || 0) < 0).length;
        const flat = stocks.filter((s: any) => (s.f3 || 0) === 0).length;
        const limitUp = stocks.filter((s: any) => (s.f3 || 0) >= 9.9).length;
        const limitDown = stocks.filter((s: any) => (s.f3 || 0) <= -9.9).length;
        
        // 平均涨跌幅
        const avgChange = stocks.reduce((sum: number, s: any) => sum + (s.f3 || 0), 0) / total / 100;
        
        // 总成交额
        const totalAmount = stocks.reduce((sum: number, s: any) => sum + (s.f6 || 0), 0);

        let output = `📊 **A股市场总览**\n\n`;
        output += `🔢 **基本数据**\n`;
        output += `- 股票总数: ${total} 只\n`;
        output += `- 上涨: ${up} 只 (${((up / total) * 100).toFixed(2)}%)\n`;
        output += `- 下跌: ${down} 只 (${((down / total) * 100).toFixed(2)}%)\n`;
        output += `- 平盘: ${flat} 只 (${((flat / total) * 100).toFixed(2)}%)\n\n`;
        
        output += `📈 **涨跌停**\n`;
        output += `- 涨停: ${limitUp} 只\n`;
        output += `- 跌停: ${limitDown} 只\n\n`;
        
        output += `💹 **市场指标**\n`;
        output += `- 平均涨跌幅: ${avgChange >= 0 ? '📈' : '📉'} ${avgChange.toFixed(2)}%\n`;
        output += `- 总成交额: ${formatMarketCapShort(totalAmount)}\n\n`;
        
        output += `🎯 **涨跌分布**\n`;
        output += `- 涨幅>7%: ${stocks.filter((s: any) => (s.f3 || 0) >= 7).length} 只\n`;
        output += `- 涨幅5-7%: ${stocks.filter((s: any) => (s.f3 || 0) >= 5 && (s.f3 || 0) < 7).length} 只\n`;
        output += `- 涨幅3-5%: ${stocks.filter((s: any) => (s.f3 || 0) >= 3 && (s.f3 || 0) < 5).length} 只\n`;
        output += `- 涨幅0-3%: ${stocks.filter((s: any) => (s.f3 || 0) > 0 && (s.f3 || 0) < 3).length} 只\n`;
        output += `- 跌幅0-3%: ${stocks.filter((s: any) => (s.f3 || 0) < 0 && (s.f3 || 0) > -3).length} 只\n`;
        output += `- 跌幅3-5%: ${stocks.filter((s: any) => (s.f3 || 0) <= -3 && (s.f3 || 0) > -5).length} 只\n`;
        output += `- 跌幅5-7%: ${stocks.filter((s: any) => (s.f3 || 0) <= -5 && (s.f3 || 0) > -7).length} 只\n`;
        output += `- 跌幅>7%: ${stocks.filter((s: any) => (s.f3 || 0) <= -7).length} 只\n`;

        return output;

    } catch (error) {
        Logger.error('获取市场总览失败:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `❌ 获取市场总览失败: ${errorMessage}`;
    }
}

export const getMarketOverviewTool: BuiltInTool = {
    name: 'get_market_overview',
    description: 'Get comprehensive A-share market overview including total stocks, up/down counts, limit board statistics, average price change, total trading volume, and price change distribution. Useful for understanding overall market sentiment.',
    inputSchema: {
        type: 'object',
        properties: {},
        required: []
    },
    execute: async () => {
        return await getMarketOverview();
    }
};
