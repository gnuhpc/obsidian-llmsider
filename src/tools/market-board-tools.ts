// Market Board Tools - Industry sectors, concept boards, and hot stock rankings
import { BuiltInTool } from './built-in-tools';
import { Logger } from './../utils/logger';
import { requestUrl } from 'obsidian';

/**
 * 市场板块相关工具
 * 基于东方财富网的行业板块、概念板块和股票热度排行接口
 */

// ==================== 股票热度排行工具 ====================

interface StockHotRankResponse {
    data: Array<{
        rk: number;          // 排名
        sc: string;          // 股票代码 (带市场标识，如 SH600519)
        sn: string;          // 股票名称
    }>;
}

interface StockPriceResponse {
    data: {
        diff: Array<{
            f14: string;     // 股票名称
            f3: number;      // 涨跌幅
            f12: string;     // 股票代码
            f2: number;      // 最新价
        }>;
    };
}

// ==================== 行业板块工具 ====================

// ==================== 行业板块工具 ====================

interface IndustryBoardResponse {
    data: {
        diff: Array<{
            f12: string;     // 板块代码
            f14: string;     // 板块名称
            f2: number;      // 最新价
            f4: number;      // 涨跌额
            f3: number;      // 涨跌幅
            f20: number;     // 总市值
            f8: number;      // 换手率
            f104: number;    // 上涨家数
            f105: number;    // 下跌家数
            f128: string;    // 领涨股票
            f140: number;    // 领涨股票涨跌幅
        }>;
    };
}

/**
 * 格式化市值
 */
function formatMarketCapShort(value: number): string {
    if (!value || isNaN(value)) return 'N/A';
    
    const yi = 100000000; // 亿
    if (value >= yi) {
        return `${(value / yi).toFixed(2)}亿`;
    }
    return `${(value / 10000).toFixed(2)}万`;
}

/**
 * 获取行业板块行情
 */
async function getIndustryBoard(sortBy: string = 'change'): Promise<string> {
    try {
        const url = 'https://17.push2.eastmoney.com/api/qt/clist/get';
        
        // 排序字段映射
        const sortFieldMap: { [key: string]: string } = {
            'change': 'f3',      // 涨跌幅
            'price': 'f2',       // 最新价
            'marketcap': 'f20',  // 总市值
            'turnover': 'f8'     // 换手率
        };
        
        const sortField = sortFieldMap[sortBy] || 'f3';
        
        const params = new URLSearchParams({
            pn: '1',
            pz: '100',
            po: '1',
            np: '1',
            ut: 'bd1d9ddb04089700cf9c27f6f7426281',
            fltt: '2',
            invt: '2',
            fid: sortField,
            fs: 'm:90 t:2 f:!50',
            fields: 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f26,f22,f33,f11,f62,f128,f136,f115,f152,f124,f107,f104,f105,f140,f141,f207,f208,f209,f222'
        });

        const response = await requestUrl({
            url: `${url}?${params.toString()}`,
            method: 'GET'
        });

        const data: IndustryBoardResponse = response.json;
        
        if (!data.data?.diff || data.data.diff.length === 0) {
            return '❌ 未获取到行业板块数据';
        }

        const boards = data.data.diff;

        // 格式化输出
        let output = `🏭 **行业板块实时行情** (共 ${boards.length} 个板块)\n\n`;
        output += `排序方式: ${sortBy === 'change' ? '涨跌幅' : sortBy === 'marketcap' ? '总市值' : sortBy === 'turnover' ? '换手率' : '最新价'}\n\n`;
        output += '| 板块名称 | 最新价 | 涨跌幅 | 总市值 | 换手率 | 上涨/下跌 | 领涨股票 |\n';
        output += '|----------|--------|--------|--------|--------|-----------|----------|\n';
        
        boards.forEach(board => {
            const changeEmoji = (board.f3 || 0) >= 0 ? '📈' : '📉';
            const price = (board.f2 || 0) / 100;
            const change = (board.f3 || 0) / 100;
            const turnover = (board.f8 || 0) / 100;
            const marketCap = formatMarketCapShort(board.f20);
            const upDown = `${board.f104 || 0}/${board.f105 || 0}`;
            const leader = board.f128 || 'N/A';
            const leaderChange = board.f140 ? `(${(board.f140 / 100).toFixed(2)}%)` : '';
            
            output += `| ${board.f14} | ${price.toFixed(2)} | ${changeEmoji} ${change.toFixed(2)}% | ${marketCap} | ${turnover.toFixed(2)}% | ${upDown} | ${leader}${leaderChange} |\n`;
        });

        return output;

    } catch (error) {
        Logger.error('获取行业板块数据失败:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `❌ 获取行业板块数据失败: ${errorMessage}`;
    }
}

export const getIndustryBoardTool: BuiltInTool = {
    name: 'get_industry_board',
    description: 'Get real-time market data for all industry sectors in China A-share market. Shows sector performance including price changes, market cap, leading stocks, etc. Useful for sector rotation analysis.',
  category: 'stock',
    inputSchema: {
        type: 'object',
        properties: {
            sort_by: {
                type: 'string',
                description: 'Sort by field: "change" (price change %), "price" (latest price), "marketcap" (market cap), "turnover" (turnover rate)',
                enum: ['change', 'price', 'marketcap', 'turnover'],
                default: 'change'
            }
        },
        required: []
    },
    execute: async (input: { sort_by?: string }) => {
        const sortBy = input.sort_by || 'change';
        return await getIndustryBoard(sortBy);
    }
};

// ==================== 概念板块工具 ====================

interface ConceptBoardResponse {
    data: {
        diff: Array<{
            f12: string;     // 板块代码
            f14: string;     // 板块名称
            f2: number;      // 最新价
            f4: number;      // 涨跌额
            f3: number;      // 涨跌幅
            f20: number;     // 总市值
            f8: number;      // 换手率
            f104: number;    // 上涨家数
            f105: number;    // 下跌家数
            f128: string;    // 领涨股票
            f136: number;    // 领涨股票涨跌幅
        }>;
    };
}

/**
 * 获取概念板块行情
 */
async function getConceptBoard(sortBy: string = 'change', limit: number = 50): Promise<string> {
    try {
        const url = 'https://79.push2.eastmoney.com/api/qt/clist/get';
        
        // 排序字段映射
        const sortFieldMap: { [key: string]: string } = {
            'change': 'f3',      // 涨跌幅
            'price': 'f2',       // 最新价
            'marketcap': 'f20',  // 总市值
            'turnover': 'f8'     // 换手率
        };
        
        const sortField = sortFieldMap[sortBy] || 'f3';
        
        const params = new URLSearchParams({
            pn: '1',
            pz: Math.min(limit, 200).toString(),
            po: '1',
            np: '1',
            ut: 'bd1d9ddb04089700cf9c27f6f7426281',
            fltt: '2',
            invt: '2',
            fid: sortField,
            fs: 'm:90 t:3 f:!50',
            fields: 'f2,f3,f4,f8,f12,f14,f15,f16,f17,f18,f20,f21,f24,f25,f22,f33,f11,f62,f128,f124,f107,f104,f105,f136'
        });

        const response = await requestUrl({
            url: `${url}?${params.toString()}`,
            method: 'GET'
        });

        const data: ConceptBoardResponse = response.json;
        
        if (!data.data?.diff || data.data.diff.length === 0) {
            return '❌ 未获取到概念板块数据';
        }

        const boards = data.data.diff.slice(0, limit);

        // 格式化输出
        let output = `💡 **概念板块实时行情** (Top ${boards.length})\n\n`;
        output += `排序方式: ${sortBy === 'change' ? '涨跌幅' : sortBy === 'marketcap' ? '总市值' : sortBy === 'turnover' ? '换手率' : '最新价'}\n\n`;
        output += '| 概念名称 | 最新价 | 涨跌幅 | 总市值 | 换手率 | 上涨/下跌 | 领涨股票 |\n';
        output += '|----------|--------|--------|--------|--------|-----------|----------|\n';
        
        boards.forEach(board => {
            const changeEmoji = (board.f3 || 0) >= 0 ? '📈' : '📉';
            const price = (board.f2 || 0) / 100;
            const change = (board.f3 || 0) / 100;
            const turnover = (board.f8 || 0) / 100;
            const marketCap = formatMarketCapShort(board.f20);
            const upDown = `${board.f104 || 0}/${board.f105 || 0}`;
            const leader = board.f128 || 'N/A';
            const leaderChange = board.f136 ? `(${(board.f136 / 100).toFixed(2)}%)` : '';
            
            output += `| ${board.f14} | ${price.toFixed(2)} | ${changeEmoji} ${change.toFixed(2)}% | ${marketCap} | ${turnover.toFixed(2)}% | ${upDown} | ${leader}${leaderChange} |\n`;
        });

        return output;

    } catch (error) {
        Logger.error('获取概念板块数据失败:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `❌ 获取概念板块数据失败: ${errorMessage}`;
    }
}

export const getConceptBoardTool: BuiltInTool = {
    name: 'get_concept_board',
    description: 'Get real-time market data for concept/theme sectors (e.g., AI, New Energy, Chip, etc.). Shows concept performance including price changes, constituent stocks, leading stocks. Useful for thematic investment analysis.',
  category: 'stock',
    inputSchema: {
        type: 'object',
        properties: {
            sort_by: {
                type: 'string',
                description: 'Sort by field: "change" (price change %), "price" (latest price), "marketcap" (market cap), "turnover" (turnover rate)',
                enum: ['change', 'price', 'marketcap', 'turnover'],
                default: 'change'
            },
            limit: {
                type: 'number',
                description: 'Number of concepts to return (1-200, default: 50)',
                default: 50
            }
        },
        required: []
    },
    execute: async (input: { sort_by?: string; limit?: number }) => {
        const sortBy = input.sort_by || 'change';
        const limit = Math.max(1, Math.min(input.limit || 50, 200));
        return await getConceptBoard(sortBy, limit);
    }
};

// ==================== 板块成分股工具 ====================

interface BoardStocksResponse {
    data: {
        diff: Array<{
            f12: string;     // 股票代码
            f14: string;     // 股票名称
            f2: number;      // 最新价
            f4: number;      // 涨跌额
            f3: number;      // 涨跌幅
            f5: number;      // 成交量
            f6: number;      // 成交额
            f15: number;     // 最高价
            f16: number;     // 最低价
            f17: number;     // 今开
            f18: number;     // 昨收
            f8: number;      // 换手率
            f10: number;     // 量比
            f20: number;     // 总市值
            f21: number;     // 流通市值
        }>;
    };
}

/**
 * 获取板块成分股
 */
async function getBoardStocks(
    boardCode: string, 
    sortBy: string = 'change',
    limit: number = 50
): Promise<string> {
    try {
        const url = 'https://push2.eastmoney.com/api/qt/clist/get';
        
        // 排序字段映射
        const sortFieldMap: { [key: string]: string } = {
            'change': 'f3',      // 涨跌幅
            'price': 'f2',       // 最新价
            'volume': 'f5',      // 成交量
            'amount': 'f6',      // 成交额
            'turnover': 'f8',    // 换手率
            'marketcap': 'f20'   // 总市值
        };
        
        const sortField = sortFieldMap[sortBy] || 'f3';
        
        const params = new URLSearchParams({
            pn: '1',
            pz: Math.min(limit, 200).toString(),
            po: '1',
            np: '1',
            ut: 'bd1d9ddb04089700cf9c27f6f7426281',
            fltt: '2',
            invt: '2',
            fid: sortField,
            fs: `b:${boardCode}`,
            fields: 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f22,f11,f62,f128,f136,f115,f152'
        });

        const response = await requestUrl({
            url: `${url}?${params.toString()}`,
            method: 'GET'
        });

        const data: BoardStocksResponse = response.json;
        
        if (!data.data?.diff || data.data.diff.length === 0) {
            return `❌ 未找到板块代码 "${boardCode}" 的成分股数据\n\n💡 提示: 请先使用 get_industry_board 或 get_concept_board 工具查询板块代码`;
        }

        const stocks = data.data.diff;

        // 格式化输出
        let output = `📋 **板块成分股** (板块代码: ${boardCode}, 共 ${stocks.length} 只股票)\n\n`;
        output += `排序方式: ${sortBy === 'change' ? '涨跌幅' : sortBy === 'volume' ? '成交量' : sortBy === 'amount' ? '成交额' : sortBy === 'turnover' ? '换手率' : sortBy === 'marketcap' ? '总市值' : '最新价'}\n\n`;
        output += '| 代码 | 名称 | 最新价 | 涨跌幅 | 成交额 | 换手率 | 总市值 |\n';
        output += '|------|------|--------|--------|--------|--------|--------|\n';
        
        stocks.forEach(stock => {
            const changeEmoji = (stock.f3 || 0) >= 0 ? '📈' : '📉';
            const price = (stock.f2 || 0) / 100;
            const change = (stock.f3 || 0) / 100;
            const amount = formatMarketCapShort(stock.f6);
            const turnover = (stock.f8 || 0) / 100;
            const marketCap = formatMarketCapShort(stock.f20);
            
            output += `| ${stock.f12} | ${stock.f14} | ${price.toFixed(2)} | ${changeEmoji} ${change.toFixed(2)}% | ${amount} | ${turnover.toFixed(2)}% | ${marketCap} |\n`;
        });

        output += `\n💡 提示: 可以使用 get_market_quote 工具查看单个股票的详细信息`;

        return output;

    } catch (error) {
        Logger.error('获取板块成分股失败:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `❌ 获取板块成分股失败: ${errorMessage}`;
    }
}

export const getBoardStocksTool: BuiltInTool = {
    name: 'get_board_stocks',
    description: 'Get constituent stocks of a specific industry or concept board. Shows stock performance within the board including prices, changes, volumes. Requires board code from get_industry_board or get_concept_board.',
  category: 'stock',
    inputSchema: {
        type: 'object',
        properties: {
            board_code: {
                type: 'string',
                description: 'Board code (e.g., "BK0447" for chip sector, "90.BK0818" for concept). Get this code from get_industry_board or get_concept_board tool first.'
            },
            sort_by: {
                type: 'string',
                description: 'Sort by field: "change" (price change %), "price", "volume", "amount", "turnover", "marketcap"',
                enum: ['change', 'price', 'volume', 'amount', 'turnover', 'marketcap'],
                default: 'change'
            },
            limit: {
                type: 'number',
                description: 'Number of stocks to return (1-200, default: 50)',
                default: 50
            }
        },
        required: ['board_code']
    },
    execute: async (input: { board_code: string; sort_by?: string; limit?: number }) => {
        const boardCode = input.board_code;
        const sortBy = input.sort_by || 'change';
        const limit = Math.max(1, Math.min(input.limit || 50, 200));
        return await getBoardStocks(boardCode, sortBy, limit);
    }
};
