// Futures Contract Information Tools
// 期货合约信息工具

import { z } from 'zod';
import { createMastraTool } from './tool-converter';

/**
 * 获取所有期货交易所列表
 */
export const getFuturesExchangeListTool = createMastraTool({
	id: 'futures_exchange_list',
	description: 'Get list and basic information of Chinese futures exchanges',
	category: 'futures',
	inputSchema: z.object({}).describe('Tool input parameters'),
	outputSchema: z.object({
		exchanges: z.array(z.object({
			name: z.string().describe('Exchange Name'),
			code: z.string().describe('Exchange Code'),
			suffix: z.string().describe('Contract Suffix'),
			website: z.string().describe('Website URL'),
			established: z.string().describe('Established Year'),
			main_products: z.string().describe('Main Products'),
			features: z.string().describe('Features')
		})).describe('Exchange List'),
		note: z.string().describe('Note')
	}).describe('List and detailed information of Chinese futures exchanges'),
	execute: async ({ context }) => {
		const exchanges = [
			{
				name: '中国金融期货交易所',
				code: 'CFFEX',
				suffix: '.CFX',
				website: 'http://www.cffex.com.cn',
				established: '2006年',
				main_products: '股指期货(IF/IH/IC/IM)、国债期货(T/TF/TS)',
				features: '金融衍生品交易平台'
			},
			{
				name: '上海期货交易所',
				code: 'SHFE',
				suffix: '.SHF',
				website: 'https://www.shfe.com.cn',
				established: '1990年',
				main_products: '金属(铜、铝、锌等)、能源(燃料油)、化工(橡胶)',
				features: '中国历史最悠久的期货交易所'
			},
			{
				name: '上海国际能源交易中心',
				code: 'INE',
				suffix: '.INE',
				website: 'https://www.ine.cn',
				established: '2013年',
				main_products: '原油、20号胶、低硫燃料油',
				features: '国际化期货市场,接受境外投资者'
			},
			{
				name: '郑州商品交易所',
				code: 'CZCE',
				suffix: '.ZCE',
				website: 'http://www.czce.com.cn',
				established: '1990年',
				main_products: '农产品(棉花、白糖)、化工(PTA、甲醇)',
				features: '中国第一家期货交易所'
			},
			{
				name: '大连商品交易所',
				code: 'DCE',
				suffix: '.DCE',
				website: 'http://www.dce.com.cn',
				established: '1993年',
				main_products: '农产品(豆粕、玉米)、化工品(聚乙烯、PVC)',
				features: '全球最大的农产品期货市场之一'
			},
			{
				name: '广州期货交易所',
				code: 'GFEX',
				suffix: '.GFEX',
				website: 'http://www.gfex.com.cn',
				established: '2021年',
				main_products: '工业硅、碳酸锂、多晶硅',
				features: '中国最新设立的期货交易所,聚焦绿色低碳'
			}
		];
		
		return {
			exchanges,
			note: '国家法定节假日期间休市,部分品种可能根据市场情况调整交易时间'
		};
	}
});

/**
 * 获取期货交易时间表
 */
export const getFuturesTradingTimeTool = createMastraTool({
	id: 'futures_trading_time',
	description: 'Get trading hours for futures products (including day and night sessions)',
	category: 'futures',
	inputSchema: z.object({
		exchange: z.enum(['SHFE', 'INE', 'DCE', 'CZCE', 'GFEX', 'CFFEX']).optional().describe('Exchange code, returns all exchanges if not provided')
	}).describe('Tool input parameters'),
	outputSchema: z.object({
		exchanges: z.array(z.object({
			exchange: z.string().describe('Exchange Code'),
			exchange_name: z.string().describe('Exchange Name'),
			products: z.array(z.object({
				symbol: z.string().describe('Product Code'),
				name: z.string().describe('Product Name'),
				call_auction: z.string().describe('Call Auction Time'),
				day_trading: z.string().describe('Day Trading Time'),
				night_trading: z.string().describe('Night Trading Time, "No Night Trading" if none')
			})).describe('Trading Product List')
		})).describe('Exchange Trading Hours'),
		note: z.string().describe('Note')
	}).describe('Futures Trading Schedule'),
	execute: async ({ context }) => {
		const allExchanges = [
			{
				exchange: 'SHFE',
				exchange_name: '上海期货交易所',
				products: [
					{ symbol: 'rb', name: '螺纹钢', call_auction: '20:55-21:00, 08:55-09:00', day_trading: '09:00-10:15, 10:30-11:30, 13:30-15:00', night_trading: '21:00-23:00' },
					{ symbol: 'hc', name: '热轧卷板', call_auction: '20:55-21:00, 08:55-09:00', day_trading: '09:00-10:15, 10:30-11:30, 13:30-15:00', night_trading: '21:00-23:00' },
					{ symbol: 'cu', name: '铜', call_auction: '20:55-21:00, 08:55-09:00', day_trading: '09:00-10:15, 10:30-11:30, 13:30-15:00', night_trading: '21:00-01:00' },
					{ symbol: 'al', name: '铝', call_auction: '20:55-21:00, 08:55-09:00', day_trading: '09:00-10:15, 10:30-11:30, 13:30-15:00', night_trading: '21:00-01:00' },
					{ symbol: 'au', name: '黄金', call_auction: '20:55-21:00, 08:55-09:00', day_trading: '09:00-10:15, 10:30-11:30, 13:30-15:00', night_trading: '21:00-02:30' },
					{ symbol: 'ag', name: '白银', call_auction: '20:55-21:00, 08:55-09:00', day_trading: '09:00-10:15, 10:30-11:30, 13:30-15:00', night_trading: '21:00-02:30' }
				]
			},
			{
				exchange: 'INE',
				exchange_name: '上海国际能源交易中心',
				products: [
					{ symbol: 'sc', name: '原油', call_auction: '20:55-21:00, 08:55-09:00', day_trading: '09:00-10:15, 10:30-11:30, 13:30-15:00', night_trading: '21:00-02:30' },
					{ symbol: 'nr', name: '20号胶', call_auction: '20:55-21:00, 08:55-09:00', day_trading: '09:00-10:15, 10:30-11:30, 13:30-15:00', night_trading: '21:00-23:00' },
					{ symbol: 'lu', name: '低硫燃料油', call_auction: '20:55-21:00, 08:55-09:00', day_trading: '09:00-10:15, 10:30-11:30, 13:30-15:00', night_trading: '21:00-23:00' }
				]
			},
			{
				exchange: 'DCE',
				exchange_name: '大连商品交易所',
				products: [
					{ symbol: 'm', name: '豆粕', call_auction: '20:55-21:00, 08:55-09:00', day_trading: '09:00-10:15, 10:30-11:30, 13:30-15:00', night_trading: '21:00-23:00' },
					{ symbol: 'y', name: '豆油', call_auction: '20:55-21:00, 08:55-09:00', day_trading: '09:00-10:15, 10:30-11:30, 13:30-15:00', night_trading: '21:00-23:00' },
					{ symbol: 'p', name: '棕榈油', call_auction: '20:55-21:00, 08:55-09:00', day_trading: '09:00-10:15, 10:30-11:30, 13:30-15:00', night_trading: '21:00-23:00' },
					{ symbol: 'i', name: '铁矿石', call_auction: '20:55-21:00, 08:55-09:00', day_trading: '09:00-10:15, 10:30-11:30, 13:30-15:00', night_trading: '21:00-23:00' },
					{ symbol: 'j', name: '焦炭', call_auction: '20:55-21:00, 08:55-09:00', day_trading: '09:00-10:15, 10:30-11:30, 13:30-15:00', night_trading: '21:00-23:00' },
					{ symbol: 'jm', name: '焦煤', call_auction: '20:55-21:00, 08:55-09:00', day_trading: '09:00-10:15, 10:30-11:30, 13:30-15:00', night_trading: '21:00-23:00' },
					{ symbol: 'jd', name: '鸡蛋', call_auction: '08:55-09:00', day_trading: '09:00-10:15, 10:30-11:30, 13:30-15:00', night_trading: '无夜盘' },
					{ symbol: 'lh', name: '生猪', call_auction: '08:55-09:00', day_trading: '09:00-10:15, 10:30-11:30, 13:30-15:00', night_trading: '无夜盘' }
				]
			},
			{
				exchange: 'CZCE',
				exchange_name: '郑州商品交易所',
				products: [
					{ symbol: 'SR', name: '白糖', call_auction: '20:55-21:00', day_trading: '09:00-10:15, 10:30-11:30, 13:30-15:00', night_trading: '21:00-23:00' },
					{ symbol: 'CF', name: '棉花', call_auction: '20:55-21:00', day_trading: '09:00-10:15, 10:30-11:30, 13:30-15:00', night_trading: '21:00-23:00' },
					{ symbol: 'TA', name: 'PTA', call_auction: '20:55-21:00', day_trading: '09:00-10:15, 10:30-11:30, 13:30-15:00', night_trading: '21:00-23:00' },
					{ symbol: 'MA', name: '甲醇', call_auction: '20:55-21:00', day_trading: '09:00-10:15, 10:30-11:30, 13:30-15:00', night_trading: '21:00-23:00' },
					{ symbol: 'FG', name: '玻璃', call_auction: '20:55-21:00', day_trading: '09:00-10:15, 10:30-11:30, 13:30-15:00', night_trading: '21:00-23:00' },
					{ symbol: 'ZC', name: '动力煤', call_auction: '20:55-21:00', day_trading: '09:00-10:15, 10:30-11:30, 13:30-15:00', night_trading: '21:00-23:00' },
					{ symbol: 'AP', name: '苹果', call_auction: '08:55-09:00', day_trading: '09:00-10:15, 10:30-11:30, 13:30-15:00', night_trading: '无夜盘' },
					{ symbol: 'CJ', name: '红枣', call_auction: '08:55-09:00', day_trading: '09:00-10:15, 10:30-11:30, 13:30-15:00', night_trading: '无夜盘' }
				]
			},
			{
				exchange: 'GFEX',
				exchange_name: '广州期货交易所',
				products: [
					{ symbol: 'SI', name: '工业硅', call_auction: '08:55-09:00', day_trading: '09:00-10:15, 10:30-11:30, 13:30-15:00', night_trading: '无夜盘' },
					{ symbol: 'LC', name: '碳酸锂', call_auction: '08:55-09:00', day_trading: '09:00-10:15, 10:30-11:30, 13:30-15:00', night_trading: '无夜盘' },
					{ symbol: 'PS', name: '多晶硅', call_auction: '08:55-09:00', day_trading: '09:00-10:15, 10:30-11:30, 13:30-15:00', night_trading: '无夜盘' }
				]
			},
			{
				exchange: 'CFFEX',
				exchange_name: '中国金融期货交易所',
				products: [
					{ symbol: 'IF', name: '沪深300', call_auction: '09:25-09:30', day_trading: '09:30-11:30, 13:00-15:00', night_trading: '无' },
					{ symbol: 'IH', name: '上证50', call_auction: '09:25-09:30', day_trading: '09:30-11:30, 13:00-15:00', night_trading: '无' },
					{ symbol: 'IC', name: '中证500', call_auction: '09:25-09:30', day_trading: '09:30-11:30, 13:00-15:00', night_trading: '无' },
					{ symbol: 'IM', name: '中证1000', call_auction: '09:25-09:30', day_trading: '09:30-11:30, 13:00-15:00', night_trading: '无' },
					{ symbol: 'TS', name: '2年期国债', call_auction: '09:15-09:30', day_trading: '09:30-11:30, 13:00-15:15', night_trading: '无' },
					{ symbol: 'TF', name: '5年期国债', call_auction: '09:15-09:30', day_trading: '09:30-11:30, 13:00-15:15', night_trading: '无' },
					{ symbol: 'T', name: '10年期国债', call_auction: '09:15-09:30', day_trading: '09:30-11:30, 13:00-15:15', night_trading: '无' }
				]
			}
		];
		
		const filtered = context.exchange 
			? allExchanges.filter(ex => ex.exchange === context.exchange)
			: allExchanges;
		
		return {
			exchanges: filtered,
			note: '夜盘品种在交易日晚上开盘,次日凌晨收盘。集合竞价分为夜盘前和日盘前两个时段。国家法定节假日期间休市。'
		};
	}
});

/**
 * 获取期货品种合约乘数
 */
export const getFuturesContractMultiplierTool = createMastraTool({
	id: 'futures_contract_multiplier',
	description: 'Get contract multiplier (tons per lot) and trading unit for futures products',
	category: 'futures',
	inputSchema: z.object({
		symbol: z.string().optional().describe('Product code, e.g., "rb" (Rebar), "cu" (Copper), "m" (Soybean Meal), etc. Returns all products if not provided')
	}).describe('Tool input parameters'),
	outputSchema: z.object({
		symbol: z.string().optional().describe('Queried Product Code'),
		contracts: z.array(z.object({
			symbol: z.string().describe('Product Code'),
			name: z.string().describe('Product Name'),
			exchange: z.string().describe('Exchange Code'),
			unit: z.string().describe('Measurement Unit'),
			multiplier: z.number().describe('Contract Multiplier (Units per Lot)'),
			example: z.string().optional().describe('Calculation Example')
		})).describe('Contract Multiplier List'),
		note: z.string().describe('Note')
	}).describe('Futures Contract Multiplier Information'),
	execute: async ({ context }) => {
		const multipliers: Record<string, {name: string; unit: string; multiplier: number; exchange: string}> = {
			// SHFE
			'rb': {name: '螺纹钢', unit: '吨', multiplier: 10, exchange: 'SHFE'},
			'hc': {name: '热轧卷板', unit: '吨', multiplier: 10, exchange: 'SHFE'},
			'cu': {name: '铜', unit: '吨', multiplier: 5, exchange: 'SHFE'},
			'al': {name: '铝', unit: '吨', multiplier: 5, exchange: 'SHFE'},
			'zn': {name: '锌', unit: '吨', multiplier: 5, exchange: 'SHFE'},
			'pb': {name: '铅', unit: '吨', multiplier: 5, exchange: 'SHFE'},
			'ni': {name: '镍', unit: '吨', multiplier: 1, exchange: 'SHFE'},
			'sn': {name: '锡', unit: '吨', multiplier: 1, exchange: 'SHFE'},
			'au': {name: '黄金', unit: '克', multiplier: 1000, exchange: 'SHFE'},
			'ag': {name: '白银', unit: '千克', multiplier: 15, exchange: 'SHFE'},
			'ru': {name: '天然橡胶', unit: '吨', multiplier: 10, exchange: 'SHFE'},
			'bu': {name: '石油沥青', unit: '吨', multiplier: 10, exchange: 'SHFE'},
			'fu': {name: '燃料油', unit: '吨', multiplier: 10, exchange: 'SHFE'},
			'sp': {name: '纸浆', unit: '吨', multiplier: 10, exchange: 'SHFE'},
			'ss': {name: '不锈钢', unit: '吨', multiplier: 5, exchange: 'SHFE'},
			// INE
			'sc': {name: '原油', unit: '桶', multiplier: 1000, exchange: 'INE'},
			'nr': {name: '20号胶', unit: '吨', multiplier: 10, exchange: 'INE'},
			'lu': {name: '低硫燃料油', unit: '吨', multiplier: 10, exchange: 'INE'},
			'bc': {name: '国际铜', unit: '吨', multiplier: 5, exchange: 'INE'},
			// DCE
			'm': {name: '豆粕', unit: '吨', multiplier: 10, exchange: 'DCE'},
			'y': {name: '豆油', unit: '吨', multiplier: 10, exchange: 'DCE'},
			'p': {name: '棕榈油', unit: '吨', multiplier: 10, exchange: 'DCE'},
			'a': {name: '豆一', unit: '吨', multiplier: 10, exchange: 'DCE'},
			'b': {name: '豆二', unit: '吨', multiplier: 10, exchange: 'DCE'},
			'c': {name: '玉米', unit: '吨', multiplier: 10, exchange: 'DCE'},
			'cs': {name: '玉米淀粉', unit: '吨', multiplier: 10, exchange: 'DCE'},
			'i': {name: '铁矿石', unit: '吨', multiplier: 100, exchange: 'DCE'},
			'j': {name: '焦炭', unit: '吨', multiplier: 100, exchange: 'DCE'},
			'jm': {name: '焦煤', unit: '吨', multiplier: 60, exchange: 'DCE'},
			'l': {name: '聚乙烯', unit: '吨', multiplier: 5, exchange: 'DCE'},
			'v': {name: '聚氯乙烯', unit: '吨', multiplier: 5, exchange: 'DCE'},
			'pp': {name: '聚丙烯', unit: '吨', multiplier: 5, exchange: 'DCE'},
			'eg': {name: '乙二醇', unit: '吨', multiplier: 10, exchange: 'DCE'},
			'eb': {name: '苯乙烯', unit: '吨', multiplier: 5, exchange: 'DCE'},
			'pg': {name: '液化石油气', unit: '吨', multiplier: 20, exchange: 'DCE'},
			'jd': {name: '鸡蛋', unit: '500千克', multiplier: 10, exchange: 'DCE'},
			'lh': {name: '生猪', unit: '吨', multiplier: 16, exchange: 'DCE'},
			// CZCE
			'SR': {name: '白糖', unit: '吨', multiplier: 10, exchange: 'CZCE'},
			'CF': {name: '棉花', unit: '吨', multiplier: 5, exchange: 'CZCE'},
			'TA': {name: 'PTA', unit: '吨', multiplier: 5, exchange: 'CZCE'},
			'MA': {name: '甲醇', unit: '吨', multiplier: 10, exchange: 'CZCE'},
			'FG': {name: '玻璃', unit: '吨', multiplier: 20, exchange: 'CZCE'},
			'ZC': {name: '动力煤', unit: '吨', multiplier: 100, exchange: 'CZCE'},
			'RM': {name: '菜粕', unit: '吨', multiplier: 10, exchange: 'CZCE'},
			'OI': {name: '菜油', unit: '吨', multiplier: 10, exchange: 'CZCE'},
			'SA': {name: '纯碱', unit: '吨', multiplier: 20, exchange: 'CZCE'},
			'UR': {name: '尿素', unit: '吨', multiplier: 20, exchange: 'CZCE'},
			'AP': {name: '苹果', unit: '吨', multiplier: 10, exchange: 'CZCE'},
			'CJ': {name: '红枣', unit: '吨', multiplier: 5, exchange: 'CZCE'},
			'PK': {name: '花生', unit: '吨', multiplier: 5, exchange: 'CZCE'},
			// GFEX
			'SI': {name: '工业硅', unit: '吨', multiplier: 5, exchange: 'GFEX'},
			'LC': {name: '碳酸锂', unit: '吨', multiplier: 1, exchange: 'GFEX'},
			'PS': {name: '多晶硅', unit: '吨', multiplier: 1, exchange: 'GFEX'},
			// CFFEX
			'IF': {name: '沪深300', unit: '点', multiplier: 300, exchange: 'CFFEX'},
			'IH': {name: '上证50', unit: '点', multiplier: 300, exchange: 'CFFEX'},
			'IC': {name: '中证500', unit: '点', multiplier: 200, exchange: 'CFFEX'},
			'IM': {name: '中证1000', unit: '点', multiplier: 200, exchange: 'CFFEX'},
			'T': {name: '10年国债', unit: '万元', multiplier: 10000, exchange: 'CFFEX'},
			'TF': {name: '5年国债', unit: '万元', multiplier: 10000, exchange: 'CFFEX'},
			'TS': {name: '2年国债', unit: '万元', multiplier: 20000, exchange: 'CFFEX'}
		};
		
		if (context.symbol) {
			const symbolKey = context.symbol.toUpperCase() in multipliers ? context.symbol.toUpperCase() : context.symbol.toLowerCase();
			const info = multipliers[symbolKey];
			
			if (!info) {
				throw new Error(`未找到品种 "${context.symbol}" 的合约信息`);
			}
			
			let example = '';
			if (info.exchange === 'CFFEX' && ['IF', 'IH', 'IC', 'IM'].includes(symbolKey)) {
				example = `假设${info.name}当前点位为4000点: 合约价值=4000×${info.multiplier}=${4000 * info.multiplier}元, 涨跌1个点的盈亏=${info.multiplier}元`;
			} else if (info.unit === '吨') {
				example = `假设${info.name}价格为5000元/吨: 1手合约价值=5000×${info.multiplier}=${5000 * info.multiplier}元, 价格变动1元的盈亏=${info.multiplier}元`;
			}
			
			return {
				symbol: context.symbol,
				contracts: [{
					symbol: symbolKey,
					name: info.name,
					exchange: info.exchange,
					unit: info.unit,
					multiplier: info.multiplier,
					example
				}],
				note: '合约价值 = 价格 × 合约乘数, 保证金 = 合约价值 × 保证金比例'
			};
		}
		
		const contracts = Object.entries(multipliers).map(([symbol, info]) => ({
			symbol,
			name: info.name,
			exchange: info.exchange,
			unit: info.unit,
			multiplier: info.multiplier
		}));
		
		return {
			contracts,
			note: '合约价值 = 价格 × 合约乘数, 保证金 = 合约价值 × 保证金比例, 手续费根据交易所和期货公司规定收取'
		};
	}
});

/**
 * 获取期货保证金比例
 */
export const getFuturesMarginRatioTool = createMastraTool({
	id: 'futures_margin_ratio',
	description: 'Get exchange margin ratio standards for futures products',
	category: 'futures',
	inputSchema: z.object({
		exchange: z.enum(['SHFE', 'INE', 'DCE', 'CZCE', 'GFEX', 'CFFEX']).optional().describe('Exchange code, returns all exchanges if not provided')
	}).describe('Tool input parameters'),
	outputSchema: z.object({
		exchanges: z.array(z.object({
			exchange: z.string().describe('Exchange Code'),
			exchange_name: z.string().describe('Exchange Name'),
			products: z.array(z.object({
				symbol: z.string().describe('Product Code'),
				name: z.string().describe('Product Name'),
				normal_month: z.string().describe('Normal Month Margin Ratio'),
				pre_delivery_month: z.string().describe('Pre-Delivery Month Margin Ratio'),
				delivery_month: z.string().describe('Delivery Month Margin Ratio'),
				hedge_ratio: z.string().optional().describe('Hedging Margin Ratio (CFFEX only)')
			})).describe('Product Margin Ratio List')
		})).describe('Exchange Margin Standards'),
		calculation_example: z.string().describe('Margin Calculation Example'),
		special_rules: z.array(z.string()).describe('Special Rules Description'),
		note: z.string().describe('Note')
	}).describe('Futures Margin Ratio Standards'),
	execute: async ({ context }) => {
		const allExchanges = [
			{
				exchange: 'SHFE',
				exchange_name: '上海期货交易所',
				products: [
					{ symbol: 'cu', name: '铜', normal_month: '8%', pre_delivery_month: '10%', delivery_month: '20%' },
					{ symbol: 'al', name: '铝', normal_month: '7%', pre_delivery_month: '9%', delivery_month: '18%' },
					{ symbol: 'zn', name: '锌', normal_month: '8%', pre_delivery_month: '10%', delivery_month: '20%' },
					{ symbol: 'pb', name: '铅', normal_month: '9%', pre_delivery_month: '11%', delivery_month: '22%' },
					{ symbol: 'ni', name: '镍', normal_month: '10%', pre_delivery_month: '12%', delivery_month: '24%' },
					{ symbol: 'sn', name: '锡', normal_month: '10%', pre_delivery_month: '12%', delivery_month: '24%' },
					{ symbol: 'au', name: '黄金', normal_month: '6%', pre_delivery_month: '8%', delivery_month: '16%' },
					{ symbol: 'ag', name: '白银', normal_month: '8%', pre_delivery_month: '10%', delivery_month: '20%' },
					{ symbol: 'rb', name: '螺纹钢', normal_month: '9%', pre_delivery_month: '11%', delivery_month: '22%' },
					{ symbol: 'hc', name: '热轧卷板', normal_month: '10%', pre_delivery_month: '12%', delivery_month: '24%' },
					{ symbol: 'ru', name: '天然橡胶', normal_month: '9%', pre_delivery_month: '11%', delivery_month: '22%' },
					{ symbol: 'fu', name: '燃料油', normal_month: '10%', pre_delivery_month: '12%', delivery_month: '24%' }
				]
			},
			{
				exchange: 'INE',
				exchange_name: '上海国际能源交易中心',
				products: [
					{ symbol: 'sc', name: '原油', normal_month: '10%', pre_delivery_month: '15%', delivery_month: '30%' },
					{ symbol: 'nr', name: '20号胶', normal_month: '9%', pre_delivery_month: '11%', delivery_month: '22%' },
					{ symbol: 'lu', name: '低硫燃料油', normal_month: '10%', pre_delivery_month: '12%', delivery_month: '24%' },
					{ symbol: 'bc', name: '国际铜', normal_month: '8%', pre_delivery_month: '10%', delivery_month: '20%' }
				]
			},
			{
				exchange: 'DCE',
				exchange_name: '大连商品交易所',
				products: [
					{ symbol: 'm', name: '豆粕', normal_month: '8%', pre_delivery_month: '10%', delivery_month: '20%' },
					{ symbol: 'y', name: '豆油', normal_month: '8%', pre_delivery_month: '10%', delivery_month: '20%' },
					{ symbol: 'p', name: '棕榈油', normal_month: '8%', pre_delivery_month: '10%', delivery_month: '20%' },
					{ symbol: 'c', name: '玉米', normal_month: '7%', pre_delivery_month: '9%', delivery_month: '18%' },
					{ symbol: 'i', name: '铁矿石', normal_month: '10%', pre_delivery_month: '12%', delivery_month: '24%' },
					{ symbol: 'j', name: '焦炭', normal_month: '12%', pre_delivery_month: '15%', delivery_month: '30%' },
					{ symbol: 'jm', name: '焦煤', normal_month: '12%', pre_delivery_month: '15%', delivery_month: '30%' },
					{ symbol: 'l', name: '聚乙烯', normal_month: '8%', pre_delivery_month: '10%', delivery_month: '20%' },
					{ symbol: 'v', name: '聚氯乙烯', normal_month: '8%', pre_delivery_month: '10%', delivery_month: '20%' },
					{ symbol: 'pp', name: '聚丙烯', normal_month: '8%', pre_delivery_month: '10%', delivery_month: '20%' },
					{ symbol: 'jd', name: '鸡蛋', normal_month: '9%', pre_delivery_month: '11%', delivery_month: '22%' },
					{ symbol: 'lh', name: '生猪', normal_month: '15%', pre_delivery_month: '18%', delivery_month: '36%' }
				]
			},
			{
				exchange: 'CZCE',
				exchange_name: '郑州商品交易所',
				products: [
					{ symbol: 'SR', name: '白糖', normal_month: '7%', pre_delivery_month: '9%', delivery_month: '18%' },
					{ symbol: 'CF', name: '棉花', normal_month: '8%', pre_delivery_month: '10%', delivery_month: '20%' },
					{ symbol: 'TA', name: 'PTA', normal_month: '8%', pre_delivery_month: '10%', delivery_month: '20%' },
					{ symbol: 'MA', name: '甲醇', normal_month: '8%', pre_delivery_month: '10%', delivery_month: '20%' },
					{ symbol: 'FG', name: '玻璃', normal_month: '9%', pre_delivery_month: '11%', delivery_month: '22%' },
					{ symbol: 'ZC', name: '动力煤', normal_month: '10%', pre_delivery_month: '12%', delivery_month: '24%' },
					{ symbol: 'RM', name: '菜粕', normal_month: '8%', pre_delivery_month: '10%', delivery_month: '20%' },
					{ symbol: 'OI', name: '菜油', normal_month: '8%', pre_delivery_month: '10%', delivery_month: '20%' },
					{ symbol: 'SA', name: '纯碱', normal_month: '10%', pre_delivery_month: '12%', delivery_month: '24%' },
					{ symbol: 'UR', name: '尿素', normal_month: '9%', pre_delivery_month: '11%', delivery_month: '22%' },
					{ symbol: 'AP', name: '苹果', normal_month: '10%', pre_delivery_month: '12%', delivery_month: '24%' },
					{ symbol: 'CJ', name: '红枣', normal_month: '12%', pre_delivery_month: '15%', delivery_month: '30%' }
				]
			},
			{
				exchange: 'GFEX',
				exchange_name: '广州期货交易所',
				products: [
					{ symbol: 'SI', name: '工业硅', normal_month: '12%', pre_delivery_month: '15%', delivery_month: '30%' },
					{ symbol: 'LC', name: '碳酸锂', normal_month: '15%', pre_delivery_month: '20%', delivery_month: '40%' },
					{ symbol: 'PS', name: '多晶硅', normal_month: '15%', pre_delivery_month: '20%', delivery_month: '40%' }
				]
			},
			{
				exchange: 'CFFEX',
				exchange_name: '中国金融期货交易所',
				products: [
					{ symbol: 'IF', name: '沪深300', normal_month: '12%', pre_delivery_month: '12%', delivery_month: '12%', hedge_ratio: '10%' },
					{ symbol: 'IH', name: '上证50', normal_month: '12%', pre_delivery_month: '12%', delivery_month: '12%', hedge_ratio: '10%' },
					{ symbol: 'IC', name: '中证500', normal_month: '15%', pre_delivery_month: '15%', delivery_month: '15%', hedge_ratio: '12%' },
					{ symbol: 'IM', name: '中证1000', normal_month: '15%', pre_delivery_month: '15%', delivery_month: '15%', hedge_ratio: '12%' },
					{ symbol: 'TS', name: '2年国债', normal_month: '0.5%', pre_delivery_month: '0.5%', delivery_month: '0.5%' },
					{ symbol: 'TF', name: '5年国债', normal_month: '1.2%', pre_delivery_month: '1.2%', delivery_month: '1.2%' },
					{ symbol: 'T', name: '10年国债', normal_month: '2%', pre_delivery_month: '2%', delivery_month: '2%' }
				]
			}
		];
		
		const filtered = context.exchange 
			? allExchanges.filter(ex => ex.exchange === context.exchange)
			: allExchanges;
		
		return {
			exchanges: filtered,
			calculation_example: '假设螺纹钢(rb)价格为4000元/吨: 合约价值=4000×10=40,000元, 交易所保证金=40,000×9%=3,600元, 期货公司保证金(假设加收3%)=40,000×12%=4,800元',
			special_rules: [
				'以上为交易所最低保证金标准',
				'期货公司实际收取保证金通常高于交易所标准',
				'临近交割月或市场波动加剧时会提高保证金',
				'不同合约月份保证金比例可能不同',
				'当日开仓又平仓(平今)可能收取不同保证金',
				'持仓量超过限仓标准需提高保证金',
				'市场异常波动时交易所有权临时提高保证金',
				'连续涨跌停板后保证金会逐级提高'
			],
			note: '保证金比例会根据市场情况动态调整,请以交易所最新公告为准'
		};
	}
});
