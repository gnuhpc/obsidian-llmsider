// Stock panorama tools - Hong Kong and US stock detailed information
// Provides comprehensive stock information including company profile, industry, concepts, and real-time data
// Mastra SDK migration from BuiltInTool format

import { createMastraTool } from './tool-converter';
import { z } from 'zod';
import { requestUrl } from 'obsidian';

// Type alias for requestUrl
type RequestUrlFn = typeof requestUrl;

/**
 * 获取港股和美股全景信息 - 老板金库
 * Get HK and US stock panorama information - LBK
 */
export const getStockPanoramaTool = createMastraTool({
  category: 'stock-global',
	id: 'get_stock_panorama_lbk',
	description: 'Get comprehensive stock information including company profile, industry classification, concepts, logo, and real-time data for Hong Kong and US stocks',
	inputSchema: z.object({
		market: z.enum(['HK', 'US']).describe('Stock market: "HK" for Hong Kong stocks, "US" for US stocks'),
		symbol: z.string().describe('Stock symbol (e.g., "9988" for Alibaba-W in HK, "AAPL" for Apple in US)')
	}).describe('Stock market and symbol parameters'),
	outputSchema: z.object({
		success: z.boolean(),
		stock_info: z.object({
			symbol: z.string(),
			market: z.string(),
			counter_id: z.string(),
			name: z.string()
		}),
		company_profile: z.object({
			logo_url: z.string().nullable(),
			icon_url: z.string().nullable(),
			intro: z.string(),
			detailed_profile: z.string(),
			wiki_url: z.string().nullable()
		}),
		industry_classification: z.object({
			belonged_industry: z.object({
				name: z.string(),
				counter_id: z.string(),
				stock_count: z.number(),
				rise_count: z.number(),
				fall_count: z.number(),
				rank: z.number()
			}).nullable()
		}),
		concepts: z.object({
			total_concepts: z.number(),
			concept_list: z.array(z.object({
				name: z.string(),
				counter_id: z.string(),
				stock_count: z.number(),
				rise_count: z.number(),
				fall_count: z.number(),
				rank: z.number()
			}))
		}),
		market_data: z.object({
			latest_price: z.string().nullable(),
			previous_close: z.string().nullable(),
			change: z.string().nullable(),
			change_percent: z.string().nullable(),
			volume: z.string().nullable(),
			turnover: z.string().nullable(),
			ipo_price: z.string().nullable(),
			trade_status: z.string().nullable(),
			timestamp: z.string().nullable(),
			one_week_preclose: z.string().nullable(),
			one_month_preclose: z.string().nullable(),
			six_month_preclose: z.string().nullable(),
			one_year_preclose: z.string().nullable(),
			three_year_preclose: z.string().nullable()
		}).nullable(),
		tags: z.array(z.object({
			name: z.string(),
			labels: z.array(z.object({
				name: z.string(),
				redirect_type: z.string(),
				target_type: z.string(),
				target_id: z.string()
			}))
		})),
		minute_data: z.array(z.object({
			timestamp: z.string(),
			price: z.string(),
			amount: z.string(),
			total_amount: z.string()
		}))
	}).describe('HK and US stock panorama data'),
	execute: async ({ context }) => {
		try {
			const { market, symbol } = context;
			
			if (!['HK', 'US'].includes(market)) {
				throw new Error('Market must be either "HK" or "US"');
			}
			
			// Ensure symbol is uppercase as the API is case-sensitive
			const upperSymbol = symbol.toUpperCase();
			const counter_id = `ST/${market}/${upperSymbol}`;
			const url = `https://m.lbkrs.com/api/forward/v1/stock-info/panorama?counter_id=${encodeURIComponent(counter_id)}`;
			
			const response = await requestUrl({
				url,
				method: 'GET',
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
					'Accept': 'application/json, text/plain, */*',
					'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
					'Referer': 'https://m.lbkrs.com/'
				}
			});
			
			const data = JSON.parse(response.text);
			
			if (data.code !== 0) {
				throw new Error(`API Error: ${data.message || 'Unknown error'}`);
			}
			
			if (!data.data) {
				throw new Error('No data available for this stock');
			}
			
			const stockData = data.data;
			
			// Format the response data
			const formattedData = {
				stock_info: {
					symbol: symbol,
					market: market,
					counter_id: counter_id,
					name: stockData.logo?.name || 'N/A'
				},
				company_profile: {
					logo_url: stockData.logo?.logo || null,
					icon_url: stockData.logo?.icon || null,
					intro: stockData.logo?.intro || 'N/A',
					detailed_profile: stockData.logo?.profile || 'N/A',
					wiki_url: stockData.logo?.wiki_url || null
				},
				industry_classification: {
					belonged_industry: stockData.belonged_industry ? {
						name: stockData.belonged_industry.name,
						counter_id: stockData.belonged_industry.counter_id,
						stock_count: stockData.belonged_industry.stock_num,
						rise_count: stockData.belonged_industry.rise_num,
						fall_count: stockData.belonged_industry.fall_num,
						rank: stockData.belonged_industry.rank
					} : null
				},
				concepts: {
					total_concepts: stockData.concepts?.total || 0,
					concept_list: stockData.concepts?.list ? stockData.concepts.list.map((concept: any) => ({
						name: concept.name,
						counter_id: concept.counter_id,
						stock_count: concept.stock_num,
						rise_count: concept.rise_num,
						fall_count: concept.fall_num,
						rank: concept.rank
					})) : []
				},
				market_data: stockData.securities && stockData.securities.length > 0 ? {
					latest_price: stockData.securities[0].prices?.last_done || null,
					previous_close: stockData.securities[0].prices?.prev_close || null,
					change: stockData.securities[0].prices?.last_done && stockData.securities[0].prices?.prev_close 
						? (parseFloat(stockData.securities[0].prices.last_done) - parseFloat(stockData.securities[0].prices.prev_close)).toFixed(2)
						: null,
					change_percent: stockData.securities[0].prices?.last_done && stockData.securities[0].prices?.prev_close 
						? (((parseFloat(stockData.securities[0].prices.last_done) - parseFloat(stockData.securities[0].prices.prev_close)) / parseFloat(stockData.securities[0].prices.prev_close)) * 100).toFixed(2) + '%'
						: null,
					volume: stockData.securities[0].prices?.amount || null,
					turnover: stockData.securities[0].prices?.balance || null,
					ipo_price: stockData.securities[0].prices?.ipo_price || null,
					trade_status: stockData.securities[0].prices?.trade_status || null,
					timestamp: stockData.securities[0].prices?.timestamp || null,
					one_week_preclose: stockData.securities[0].prices?.one_week_preclose || null,
					one_month_preclose: stockData.securities[0].prices?.one_month_preclose || null,
					six_month_preclose: stockData.securities[0].prices?.six_month_preclose || null,
					one_year_preclose: stockData.securities[0].prices?.one_year_preclose || null,
					three_year_preclose: stockData.securities[0].prices?.three_year_preclose || null
				} : null,
				tags: stockData.tags ? stockData.tags.map((tag: any) => ({
					name: tag.name,
					labels: tag.labels ? tag.labels.map((label: any) => ({
						name: label.name,
						redirect_type: label.redirect_type,
						target_type: label.target_type,
						target_id: label.target_id
					})) : []
				})) : [],
				minute_data: stockData.securities && stockData.securities.length > 0 && stockData.securities[0].minutes 
					? stockData.securities[0].minutes.slice(-10).map((minute: any) => ({
						timestamp: minute.timestamp,
						price: minute.price,
						amount: minute.amount,
						total_amount: minute.total_amount
					}))
					: []
			};
			
			return {
				success: true,
				...formattedData
			};
			
		} catch (error) {
			if (error instanceof Error) {
				throw new Error(`Failed to fetch stock panorama data: ${error.message}`);
			}
			throw new Error('Failed to fetch stock panorama data: Unknown error');
		}
	}
});

/**
 * 获取多只股票简要信息比较
 * Get multiple stocks brief comparison
 */
export const compareStocksPanoramaTool = createMastraTool({
  category: 'stock-global',
	id: 'compare_stocks_panorama_lbk',
	description: 'Compare multiple stocks from Hong Kong and US markets with basic information and price data',
	inputSchema: z.object({
		stocks: z.array(z.object({
			market: z.enum(['HK', 'US']).describe('Stock market: "HK" or "US"'),
			symbol: z.string().describe('Stock symbol')
		})).min(2).max(10).describe('Array of stock objects with market and symbol')
	}).describe('Array of stocks to compare'),
	outputSchema: z.object({
		success: z.boolean(),
		comparison_results: z.array(z.any()),
		summary: z.object({
			total_stocks: z.number(),
			successful: z.number(),
			failed: z.number()
		})
	}).describe('Multiple stocks brief comparison data'),
	execute: async ({ context }) => {
		try {
			const { stocks } = context;
			
			if (!Array.isArray(stocks) || stocks.length < 2) {
				throw new Error('At least 2 stocks are required for comparison');
			}
			
			if (stocks.length > 10) {
				throw new Error('Maximum 10 stocks allowed for comparison');
			}
			
			const results = [];
			
			for (const stock of stocks) {
				try {
					// Ensure symbol is uppercase as the API is case-sensitive
					const upperSymbol = stock.symbol.toUpperCase();
					const counter_id = `ST/${stock.market}/${upperSymbol}`;
					const url = `https://m.lbkrs.com/api/forward/v1/stock-info/panorama?counter_id=${encodeURIComponent(counter_id)}`;
					
					const response = await requestUrl({
						url,
						method: 'GET',
						headers: {
							'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
							'Accept': 'application/json, text/plain, */*',
							'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
							'Referer': 'https://m.lbkrs.com/'
						}
					});
					
					const data = JSON.parse(response.text);
					
					if (data.code === 0 && data.data) {
						const stockData = data.data;
						const prices = stockData.securities?.[0]?.prices;
						
						results.push({
							symbol: stock.symbol,
							market: stock.market,
							name: stockData.logo?.name || 'N/A',
							counter_id: counter_id,
							current_price: prices?.last_done || null,
							previous_close: prices?.prev_close || null,
							change: prices?.last_done && prices?.prev_close 
								? (parseFloat(prices.last_done) - parseFloat(prices.prev_close)).toFixed(2)
								: null,
							change_percent: prices?.last_done && prices?.prev_close 
								? (((parseFloat(prices.last_done) - parseFloat(prices.prev_close)) / parseFloat(prices.prev_close)) * 100).toFixed(2) + '%'
								: null,
							industry: stockData.belonged_industry?.name || 'N/A',
							concepts_count: stockData.concepts?.total || 0,
							main_concepts: stockData.concepts?.list ? 
								stockData.concepts.list.slice(0, 3).map((c: any) => c.name).join(', ') 
								: 'N/A',
							status: 'success'
						});
					} else {
						results.push({
							symbol: stock.symbol,
							market: stock.market,
							status: 'error',
							error: data.message || 'No data available'
						});
					}
				} catch (error) {
					results.push({
						symbol: stock.symbol,
						market: stock.market,
						status: 'error',
						error: error instanceof Error ? error.message : 'Unknown error'
					});
				}
			}
			
			return {
				success: true,
				comparison_results: results,
				summary: {
					total_stocks: stocks.length,
					successful: results.filter(r => r.status === 'success').length,
					failed: results.filter(r => r.status === 'error').length
				}
			};
			
		} catch (error) {
			if (error instanceof Error) {
				throw new Error(`Failed to compare stocks: ${error.message}`);
			}
			throw new Error('Failed to compare stocks: Unknown error');
		}
	}
});

/**
 * 获取股票评分信息
 * Get stock security ratings
 */
export const getStockRatingsTool = createMastraTool({
  category: 'stock-global',
	id: 'get_stock_ratings_lbk',
	description: 'Get comprehensive stock ratings including investment style, scale, multi-dimensional scores covering profitability, growth, cash flow, operations, and debt for Hong Kong and US stocks',
	inputSchema: z.object({
		market: z.enum(['HK', 'US']).describe('Stock market: "HK" for Hong Kong stocks, "US" for US stocks'),
		symbol: z.string().describe('Stock symbol (e.g., "9988" for Alibaba-W in HK, "AAPL" for Apple in US)')
	}).describe('Stock market and symbol for ratings'),
	outputSchema: z.object({
		success: z.boolean(),
		stock_info: z.any(),
		investment_profile: z.any(),
		overall_rating: z.any(),
		industry_comparison: z.any(),
		detailed_ratings: z.array(z.any()),
		report_info: z.any(),
		risk_warning: z.any().nullable()
	}).describe('Stock ratings and analyst recommendations data'),
	execute: async ({ context }) => {
		try {
			const { market, symbol } = context;
			
			if (!['HK', 'US'].includes(market)) {
				throw new Error('Market must be either "HK" or "US"');
			}
			
			// Ensure symbol is uppercase as the API is case-sensitive
			const upperSymbol = symbol.toUpperCase();
			const counter_id = `ST/${market}/${upperSymbol}`;
			const url = `https://m.lbkrs.com/api/forward/v2/stock-info/security-ratings?counter_id=${encodeURIComponent(counter_id)}`;
			
			const response = await requestUrl({
				url,
				method: 'GET',
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
					'Accept': 'application/json, text/plain, */*',
					'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
					'Referer': 'https://m.lbkrs.com/'
				}
			});
			
			const data = JSON.parse(response.text);
			
			if (data.code !== 0) {
				throw new Error(`API Error: ${data.message || 'Unknown error'}`);
			}
			
			if (!data.data) {
				throw new Error('No rating data available for this stock');
			}
			
			const ratingData = data.data;
			
			// Extract and format rating information
			const formattedData = {
				stock_info: {
					symbol: symbol,
					market: market,
					counter_id: counter_id
				},
				investment_profile: {
					style_grid: ratingData.invest_style_grid,
					style_description: ratingData.invest_style_description,
					scale_description: ratingData.scale_description,
					style_detail: {
						name: ratingData.style_txt_name,
						description: ratingData.style_txt_value
					},
					scale_detail: {
						name: ratingData.scale_txt_name,
						description: ratingData.scale_txt_value
					}
				},
				overall_rating: {
					score: ratingData.multi_score,
					letter: ratingData.multi_letter,
					score_change: ratingData.multi_score_change
				},
				industry_comparison: {
					industry_name: ratingData.industry_name,
					industry_id: ratingData.industry_id,
					rank: ratingData.industry_rank,
					total_companies: ratingData.industry_total,
					industry_mean_score: ratingData.industry_mean_score,
					industry_mean_letter: ratingData.industry_mean_letter,
					industry_median_score: ratingData.industry_median_score,
					industry_median_letter: ratingData.industry_median_letter
				},
				detailed_ratings: ratingData.ratings?.map((rating: any) => {
					const mainIndicator = rating.indicator;
					return {
						type: rating.type,
						type_name: rating.type === 1 ? '风格评分' : rating.type === 2 ? '规模评分' : '多维评分',
						main_indicator: {
							field_name: mainIndicator.field_name,
							name: mainIndicator.name,
							score: mainIndicator.score,
							letter: mainIndicator.letter,
							change: mainIndicator.change
						},
						sub_categories: rating.sub_indicators?.map((sub: any) => ({
							category_name: sub.indicator.name,
							category_score: sub.indicator.score,
							category_letter: sub.indicator.letter,
							metrics: sub.sub_indicators?.map((metric: any) => ({
								name: metric.name || metric.indicator?.name,
								field_name: metric.field_name || metric.indicator?.field_name,
								value: metric.value,
								value_type: metric.value_type,
								score: metric.score,
								letter: metric.letter,
								change: metric.change,
								value_color: metric.value_color
							})) || []
						})) || []
					};
				}) || [],
				report_info: {
					report_period: ratingData.report_period_txt,
					fiscal_year_info: ratingData.fiscal_year_txt,
					update_time: ratingData.update_time
				},
				risk_warning: ratingData.trap_enabled ? {
					enabled: ratingData.trap_enabled,
					type: ratingData.trap_type,
					title: ratingData.trap_title,
					content: ratingData.trap_content,
					icon_url: ratingData.trap_icon_url
				} : null
			};
			
			return {
				success: true,
				...formattedData
			};
			
		} catch (error) {
			if (error instanceof Error) {
				throw new Error(`Failed to fetch stock ratings: ${error.message}`);
			}
			throw new Error('Failed to fetch stock ratings: Unknown error');
		}
	}
});

/**
 * 获取股票行业排名信息
 * Get stock industry ranking information
 */
export const getStockIndustryRankingTool = createMastraTool({
  category: 'stock-global',
	id: 'get_stock_industry_ranking_lbk',
	description: 'Get stock industry ranking information including market value, revenue, profit, ROE and dividend yield rankings. Supports Hong Kong (HK) and US stocks.',
	outputSchema: z.object({
		symbol: z.string(),
		market: z.string(),
		rankings: z.array(z.any()).describe('Industry rank metrics')
	}).describe('Stock industry ranking data'),
	inputSchema: z.object({
		symbol: z.string().describe('Stock symbol (e.g., "AAPL", "GOOGL", "9988")'),
		market: z.enum(['HK', 'US']).describe('Market code: HK for Hong Kong Stock Exchange, US for US Stock Market')
	}).describe('Stock market and symbol for industry ranking'),
	execute: async ({ context }) => {
		const { symbol, market } = context;
		
		try {
			const counterId = `ST/${market.toUpperCase()}/${symbol.toUpperCase()}`;
			const encodedCounterId = encodeURIComponent(counterId);
			const url = `https://m.lbkrs.com/api/forward/stock-info/ranking-in-industry?counter_id=${encodedCounterId}`;
			
			const response = await requestUrl({
				url,
				method: 'GET'
			});
			
			if (!response || !response.json) {
				throw new Error('Invalid API response');
			}
			
			const data = response.json;
			
			if (data.code !== 0) {
				throw new Error(data.message || 'API request failed');
			}
			
		const rankingData = data.data;
		
		// Parse indicators array and create a map
		const indicators = rankingData.indicators || [];
		const total = rankingData.total || 0;
		const currency = rankingData.currency || '';
		
		// Create indicator map by code
		const indicatorMap: Record<string, any> = {};
		indicators.forEach((ind: any) => {
			indicatorMap[ind.code] = ind;
		});
		
		// Format the ranking data
		const formattedData = {
			stock: {
				counter_id: counterId,
				symbol: symbol,
				market: market
			},
			industry_rankings: {
				market_value: indicatorMap.market_value ? {
					indicator: indicatorMap.market_value.name,
					value: indicatorMap.market_value.value,
					unit: indicatorMap.market_value.unit || currency,
					rank: indicatorMap.market_value.ranking,
					total_companies: total,
					rank_display: `${indicatorMap.market_value.ranking}/${total}`
				} : null,
				revenue: indicatorMap.operating_revenue ? {
					indicator: indicatorMap.operating_revenue.name,
					value: indicatorMap.operating_revenue.value,
					unit: indicatorMap.operating_revenue.unit || currency,
					rank: indicatorMap.operating_revenue.ranking,
					total_companies: total,
					rank_display: `${indicatorMap.operating_revenue.ranking}/${total}`
				} : null,
				net_profit: indicatorMap.net_profit ? {
					indicator: indicatorMap.net_profit.name,
					value: indicatorMap.net_profit.value,
					unit: indicatorMap.net_profit.unit || currency,
					rank: indicatorMap.net_profit.ranking,
					total_companies: total,
					rank_display: `${indicatorMap.net_profit.ranking}/${total}`
				} : null,
				roe: indicatorMap.roe ? {
					indicator: indicatorMap.roe.name,
					value: indicatorMap.roe.value,
					unit: indicatorMap.roe.unit || '%',
					rank: indicatorMap.roe.ranking,
					total_companies: total,
					rank_display: `${indicatorMap.roe.ranking}/${total}`
				} : null,
				dividend_yield: indicatorMap.dividend ? {
					indicator: indicatorMap.dividend.name,
					value: indicatorMap.dividend.value,
					unit: indicatorMap.dividend.unit || '%',
					rank: indicatorMap.dividend.ranking,
					total_companies: total,
					rank_display: `${indicatorMap.dividend.ranking}/${total}`
				} : null
			},
			currency: currency,
			total_companies_in_industry: total,
			timestamp: new Date().toISOString()
		};
			return {
				symbol,
				market,
				rankings: formattedData
			};
			
		} catch (error) {
			if (error instanceof Error) {
				throw new Error(`Failed to fetch industry rankings: ${error.message}`);
			}
			throw new Error('Failed to fetch industry rankings: Unknown error');
		}
	}
});

/**
 * 获取公司高管信息
 * Get company professionals/executives information
 */
export const getStockCompanyProfessionalsTool = createMastraTool({
  category: 'stock-global',
	id: 'get_stock_company_professionals_lbk',
	description: 'Get information about company executives and professionals including CEO, directors, and other key personnel. Supports Hong Kong (HK) and US stocks.',
	outputSchema: z.object({
		symbol: z.string(),
		market: z.string(),
		professionals: z.array(z.any()).describe('List of executives')
	}).describe('Company executives and management team information'),
	inputSchema: z.object({
		symbol: z.string().describe('Stock symbol (e.g., "AAPL", "GOOGL", "9988")'),
		market: z.enum(['HK', 'US']).describe('Market code: HK for Hong Kong Stock Exchange, US for US Stock Market')
	}).describe('Stock market and symbol for professionals info'),
	execute: async ({ context }) => {
		const { symbol, market } = context;
		
		try {
			const counterId = `ST/${market.toUpperCase()}/${symbol.toUpperCase()}`;
			const encodedCounterId = encodeURIComponent(counterId);
			const url = `https://m.lbkrs.com/api/forward/stock-info/company-professionals?counter_ids=${encodedCounterId}`;
			
			const response = await requestUrl({
				url,
				method: 'GET'
			});
			
			if (!response || !response.json) {
				throw new Error('Invalid API response');
			}
			
			const data = response.json;
			
			if (data.code !== 0) {
				throw new Error(data.message || 'API request failed');
			}
			
			const professionalList = data.data?.professional_list?.[0];
			
			if (!professionalList) {
				throw new Error('No professional data found');
			}
			
			// Format the professional data
			const formattedData = {
				stock: {
					counter_id: professionalList.counter_id,
					symbol: symbol,
					market: market
				},
				company_professionals: {
					total_count: professionalList.total,
					professionals: professionalList.professionals.map((prof: any) => ({
						id: prof.id,
						name: prof.name,
						name_chinese: prof.name_zhcn,
						name_english: prof.name_en,
						title: prof.title,
						biography: prof.biography ? prof.biography.substring(0, 500) + (prof.biography.length > 500 ? '...' : '') : null,
						wiki_url: prof.wiki_url,
						photo_url: prof.photo || null
					}))
				},
				forward_url: professionalList.forward_url,
				timestamp: new Date().toISOString()
			};
			
			return {
				symbol,
				market,
				professionals: formattedData
			};
			
		} catch (error) {
			if (error instanceof Error) {
				throw new Error(`Failed to fetch company professionals: ${error.message}`);
			}
			throw new Error('Failed to fetch company professionals: Unknown error');
		}
	}
});

/**
 * 获取公司动态（分红、业绩披露等）
 * Get company actions (dividends, earnings, etc.)
 */
export const getStockCompanyActionsTool = createMastraTool({
  category: 'stock-global',
	id: 'get_stock_company_actions_lbk',
	description: 'Get company actions and events including dividends, earnings reports, stock splits, and other corporate actions. Supports Hong Kong (HK) and US stocks.',
	outputSchema: z.object({
		symbol: z.string(),
		market: z.string(),
		actions: z.array(z.any()).describe('Corporate actions list')
	}).describe('Company dividends, splits, and other corporate actions data'),
	inputSchema: z.object({
		symbol: z.string().describe('Stock symbol (e.g., "AAPL", "GOOGL", "9988")'),
		market: z.enum(['HK', 'US']).describe('Market code: HK for Hong Kong Stock Exchange, US for US Stock Market'),
		req_type: z.number().describe('Request type: 1 for all actions, 2 for recent only (default: 1)')
	}).describe('Stock market and symbol for company actions'),
	execute: async ({ context }) => {
		const { symbol, market, req_type = 1 } = context;
		
		try {
			const counterId = `ST/${market.toUpperCase()}/${symbol.toUpperCase()}`;
			const encodedCounterId = encodeURIComponent(counterId);
			const url = `https://m.lbkrs.com/api/forward/v2/stock-info/companyact?counter_id=${encodedCounterId}&req_type=${req_type}&version=2`;
			
			const response = await requestUrl({
				url,
				method: 'GET'
			});
			
			if (!response || !response.json) {
				throw new Error('Invalid API response');
			}
			
			const data = response.json;
			
			if (data.code !== 0) {
				throw new Error(data.message || 'API request failed');
			}
			
			const items = data.data?.items || [];
			
			// Group actions by type
			const groupedActions: Record<string, any[]> = {};
			items.forEach((item: any) => {
				const actType = item.act_type || 'Other';
				if (!groupedActions[actType]) {
					groupedActions[actType] = [];
				}
				groupedActions[actType].push({
					id: item.id,
					date: item.date,
					date_str: item.date_str,
					date_type: item.date_type,
					date_zone: item.date_zone,
					description: item.act_desc,
					action: item.action,
					is_recent: item.recent,
					is_delayed: item.is_delay,
					delay_content: item.delay_content
				});
			});
			
			// Format the data
			const formattedData = {
				stock: {
					counter_id: counterId,
					symbol: symbol,
					market: market
				},
				company_actions: {
					total_count: items.length,
					action_types: Object.keys(groupedActions),
					actions_by_type: groupedActions,
					all_actions: items.slice(0, 20).map((item: any) => ({
						id: item.id,
						date: item.date,
						date_display: item.date_str,
						date_timezone: item.date_zone,
						action_type: item.act_type,
						date_type: item.date_type,
						description: item.act_desc,
						is_recent: item.recent
					}))
				},
				timestamp: new Date().toISOString()
			};
			
			return formattedData;
			
		} catch (error) {
			if (error instanceof Error) {
				throw new Error(`Failed to fetch company actions: ${error.message}`);
			}
			throw new Error('Failed to fetch company actions: Unknown error');
		}
	}
});

/**
 * 获取公司公告通知
 * Get company notices and announcements
 */
export const getStockNoticesTool = createMastraTool({
  category: 'stock-global',
	id: 'get_stock_notices_lbk',
	description: 'Get company notices, announcements, and regulatory filings including SEC filings, annual reports, and other official documents. Supports Hong Kong (HK) and US stocks.',
	outputSchema: z.object({
		symbol: z.string(),
		market: z.string(),
		notices: z.array(z.any()).describe('List of notices')
	}).describe('Company announcements and notices data'),
	inputSchema: z.object({
		symbol: z.string().describe('Stock symbol (e.g., "AAPL", "GOOGL", "9988")'),
		market: z.enum(['HK', 'US']).describe('Market code: HK for Hong Kong Stock Exchange, US for US Stock Market'),
		limit: z.number().describe('Number of notices to retrieve (default: 20, max: 50)')
	}).describe('Stock market, symbol, and pagination parameters'),
	execute: async ({ context }) => {
		const { symbol, market, limit = 20 } = context;
		
		try {
			const counterId = `ST/${market.toUpperCase()}/${symbol.toUpperCase()}`;
			const encodedCounterId = encodeURIComponent(counterId);
			const actualLimit = Math.min(Math.max(1, limit), 50);
			const url = `https://m.lbkrs.com/api/forward/v1/notices?counter_id=${encodedCounterId}&limit=${actualLimit}&tail_mark=0`;
			
			const response = await requestUrl({
				url,
				method: 'GET'
			});
			
			if (!response || !response.json) {
				throw new Error('Invalid API response');
			}
			
			const data = response.json;
			
			if (data.code !== 0) {
				throw new Error(data.message || 'API request failed');
			}
			
			const notices = data.data?.notices || [];
			
			// Map category codes to descriptions
			const categoryMap: Record<number, string> = {
				3: 'Annual Report',
				8: 'Ownership Change',
				100: 'Delisting Notice',
				// Add more categories as needed
			};
			
			// Format the notices data
			const formattedData = {
				stock: {
					counter_id: counterId,
					symbol: symbol,
					market: market,
					stock_name: notices[0]?.stock_name || symbol
				},
				notices: {
					total_count: notices.length,
					items: notices.map((notice: any) => ({
						id: notice.id,
						category_name: categoryMap[notice.category] || `Category ${notice.category}`,
						title: notice.title,
						description: notice.description,
						file_name: notice.file_name,
						publish_at: notice.publish_at,
						publish_at_with_timezone: notice.publish_at_with_timezone,
						detail_url: notice.detail_url,
						share_url: notice.share_url,
						file_details: notice.file_details?.map((file: any) => ({
							name: file.name,
							url: file.url
						})) || [],
						markets: notice.markets
					}))
				},
				timestamp: new Date().toISOString()
			};
			
			return formattedData;
			
		} catch (error) {
			if (error instanceof Error) {
				throw new Error(`Failed to fetch stock notices: ${error.message}`);
			}
			throw new Error('Failed to fetch stock notices: Unknown error');
		}
	}
});

/**
 * Get stock intraday timeshares data
 * 获取股票分时数据
 */
export const getStockTimesharesTool = createMastraTool({
  category: 'stock-global',
	id: 'get_stock_timeshares_lbk',
	description:
		'Get intraday timeshares data for HK or US stocks, including minute-by-minute price, volume, and average price. Returns detailed trading data for current trading session.',
	outputSchema: z.object({
		symbol: z.string(),
		market: z.string(),
		timeshares: z.array(z.any()).describe('Minute-by-minute data')
	}).describe('Stock intraday trading data'),
	inputSchema: z.object({
		symbol: z.string().describe('Stock symbol (e.g., AAPL, GOOGL, 00700, 09988)'),
		market: z.enum(['US', 'HK']).describe('Market type: US for US stocks, HK for Hong Kong stocks'),
		trade_session: z.number().describe('Trading session: 1 for pre-market, 2 for regular market. Default is 2')
	}).describe('Tool input parameters'),
	execute: async ({ context }) => {
		const { symbol, market, trade_session = 2 } = context;

		if (!symbol || !market) {
			throw new Error('Missing required parameters: symbol and market');
		}

		// Construct counter_id
		const upperSymbol = symbol.toUpperCase();
		const counterId = `ST/${market}/${upperSymbol}`;

		try {
			const url = `https://m.lbkrs.com/api/forward/v5/quote/stock/timeshares?counter_id=${encodeURIComponent(
				counterId
			)}&trade_session=${trade_session}`;

			const response = await requestUrl({
				url,
				method: 'GET',
				headers: {
					Accept: 'application/json'
				}
			});

			if (response.status === 200) {
				const result = JSON.parse(response.text);
				if (result.code === 0 && result.data) {
					const data = result.data;
					const basePrice = data.base_price || 'N/A';
					const timeshares = data.timeshares || [];

					if (timeshares.length === 0) {
						return `No timeshares data available for ${symbol} (${market}).`;
					}

					let output = `# ${symbol} (${market}) - Intraday Timeshares\n\n`;
					output += `**Base Price**: ${basePrice}\n`;
					output += `**Trading Session**: ${trade_session === 1 ? 'Pre-market' : 'Regular market'}\n\n`;

					// Process timeshares data
					timeshares.forEach((dayData: any, dayIndex: number) => {
						const date = new Date(parseInt(dayData.date) * 1000);
						const preClose = dayData.pre_close || 'N/A';
						const minutes = dayData.minutes || [];

						if (minutes.length === 0) return;

						output += `## Trading Date: ${date.toISOString().split('T')[0]}\n`;
						output += `**Previous Close**: ${preClose}\n\n`;

						// Show first few minutes and last few minutes
						const showCount = Math.min(5, Math.floor(minutes.length / 2));
						const firstMinutes = minutes.slice(0, showCount);
						const lastMinutes = minutes.slice(-showCount);

						output += `### Opening Minutes (First ${showCount})\n\n`;
						output += '| Time | Price | Volume | Total Volume | Avg Price | Total Amount |\n';
						output += '|------|-------|--------|--------------|-----------|--------------|\n';

						firstMinutes.forEach((minute: any) => {
							const time = new Date(parseInt(minute.timestamp) * 1000);
							const timeStr = time.toISOString().substr(11, 8);
							output += `| ${timeStr} | ${minute.price} | ${minute.amount} | ${minute.total_amount} | ${minute.avg_price} | ${minute.total_balance} |\n`;
						});

						if (minutes.length > showCount * 2) {
							output += `\n*... ${minutes.length - showCount * 2} more minutes ...*\n\n`;
						}

						output += `\n### Closing Minutes (Last ${showCount})\n\n`;
						output += '| Time | Price | Volume | Total Volume | Avg Price | Total Amount |\n';
						output += '|------|-------|--------|--------------|-----------|--------------|\n';

						lastMinutes.forEach((minute: any) => {
							const time = new Date(parseInt(minute.timestamp) * 1000);
							const timeStr = time.toISOString().substr(11, 8);
							output += `| ${timeStr} | ${minute.price} | ${minute.amount} | ${minute.total_amount} | ${minute.avg_price} | ${minute.total_balance} |\n`;
						});

						// Summary
						const lastMinute = minutes[minutes.length - 1];
						output += `\n### Summary\n`;
						output += `- **Total Data Points**: ${minutes.length} minutes\n`;
						output += `- **Latest Price**: ${lastMinute.price}\n`;
						output += `- **Total Volume**: ${lastMinute.total_amount}\n`;
						output += `- **Total Amount**: ${lastMinute.total_balance}\n`;
						output += `- **Average Price**: ${lastMinute.avg_price}\n\n`;
					});

					return output;
				}
				throw new Error(
					`API returned error: ${result.message || 'Unknown error'}`
				);
			}
			throw new Error(
				`Failed to fetch stock timeshares: HTTP ${response.status}`
			);
		} catch (error) {
			if (error instanceof Error) {
				throw error;
			}
			throw new Error('Failed to fetch stock timeshares: Unknown error');
		}
	}
});

/**
 * Get stock pinned activities (important events)
 * 获取股票固定活动（重要事件）
 */
export const getStockPinnedActivitiesTool = createMastraTool({
  category: 'stock-global',
	id: 'get_stock_pinned_activities_lbk',
	description:
		'Get pinned important activities for HK or US stocks, such as upcoming dividend ex-dates, earnings releases, and other significant events. Returns events that are currently pinned/highlighted.',
	outputSchema: z.object({
		symbol: z.string(),
		market: z.string(),
		activities: z.array(z.any()).describe('Pinned events list')
	}).describe('Stock pinned activities and events data'),
	inputSchema: z.object({
		symbol: z.string().describe('Stock symbol (e.g., AAPL, GOOGL, 00700, 09988)'),
		market: z.enum(['US', 'HK']).describe('Market type: US for US stocks, HK for Hong Kong stocks')
	}).describe('Tool input parameters'),
	execute: async ({ context }) => {
		const { symbol, market } = context;

		if (!symbol || !market) {
			throw new Error('Missing required parameters: symbol and market');
		}

		// Construct counter_id
		const upperSymbol = symbol.toUpperCase();
		const counterId = `ST/${market}/${upperSymbol}`;

		try {
			const url = `https://m.lbkrs.com/api/forward/v1/stock/pinned_activities?counter_id=${encodeURIComponent(
				counterId
			)}&omit_actions=`;

			const response = await requestUrl({
				url,
				method: 'GET',
				headers: {
					Accept: 'application/json'
				}
			});

			if (response.status === 200) {
				const result = JSON.parse(response.text);
				if (result.code === 0 && result.data) {
					const activities = result.data.activities || [];

					if (activities.length === 0) {
						return `No pinned activities found for ${symbol} (${market}).`;
					}

					let output = `# ${symbol} (${market}) - Pinned Activities\n\n`;
					output += `**Total Pinned Events**: ${activities.length}\n\n`;

					activities.forEach((activity: any, index: number) => {
						const actedAt = activity.acted_at
							? new Date(activity.acted_at * 1000)
									.toISOString()
									.split('T')[0]
							: 'N/A';

						output += `## ${index + 1}. ${activity.action_title || activity.title}\n\n`;
						output += `- **Event Date**: ${actedAt}\n`;
						output += `- **Type**: ${activity.mine_type || activity.action}\n`;
						output += `- **Title**: ${activity.title}\n`;

						if (activity.overview) {
							output += `- **Overview**:\n\`\`\`\n${activity.overview}\n\`\`\`\n`;
						}

						if (activity.description) {
							output += `- **Description**: ${activity.description}\n`;
						}

						if (activity.target_type) {
							output += `- **Target Type**: ${activity.target_type}\n`;
						}

						if (activity.redirect_url) {
							output += `- **More Info**: ${activity.redirect_url}\n`;
						}

						output += '\n';
					});

					return output;
				}
				throw new Error(
					`API returned error: ${result.message || 'Unknown error'}`
				);
			}
			throw new Error(
				`Failed to fetch pinned activities: HTTP ${response.status}`
			);
		} catch (error) {
			if (error instanceof Error) {
				throw error;
			}
			throw new Error('Failed to fetch pinned activities: Unknown error');
		}
	}
});

/**
 * Get market macro economic data
 * 获取市场宏观经济数据
 */
export const getMarketMacroDataTool = createMastraTool({
  category: 'stock-global',
	id: 'get_market_macro_data_lbk',
	description:
		'Get upcoming macro economic data releases for global markets including US, HK, and CN. Returns economic indicators such as unemployment rate, GDP, CPI, trade balance, etc. with previous, estimated, and actual values.',
	outputSchema: z.object({
		market: z.string(),
		indicators: z.array(z.any()).describe('Economic indicators')
	}).describe('Market macro economic data'),
	inputSchema: z.object({
		market: z.enum(['US', 'HK', 'CN', 'ALL']).describe('Market filter: US for United States, HK for Hong Kong, CN for China, ALL for all markets. Default is ALL')
	}).describe('Tool input parameters'),
	execute: async ({ context }) => {
		const { market = 'ALL' } = context;

		try {
			const url = 'https://m.lbkrs.com/api/forward/stock/activity/macro_data_for_market';

			const response = await requestUrl({
				url,
				method: 'GET',
				headers: {
					Accept: 'application/json'
				}
			});

			if (response.status === 200) {
				const result = JSON.parse(response.text);
				if (result.code === 0 && result.data) {
					const items = result.data.items || [];

					if (items.length === 0) {
						return 'No macro economic data available.';
					}

					let output = '# Market Macro Economic Data\n\n';

					// Filter by market if specified
					const filteredItems =
						market === 'ALL'
							? items
							: items.filter((item: any) => item.market === market);

					if (filteredItems.length === 0) {
						return `No macro economic data available for ${market} market.`;
					}

					filteredItems.forEach((marketData: any) => {
						const marketName = marketData.market || 'Unknown';
						const dataItems = marketData.items || [];

						if (dataItems.length === 0) return;

						output += `## ${marketName} Market\n\n`;
						output += `**Total Indicators**: ${dataItems.length}\n\n`;

						// Group by date
						const groupedByDate: Record<string, any[]> = {};
						dataItems.forEach((item: any) => {
							const date = item.date || 'Unknown';
							if (!groupedByDate[date]) {
								groupedByDate[date] = [];
							}
							groupedByDate[date].push(item);
						});

						// Sort dates
						const sortedDates = Object.keys(groupedByDate).sort();

						// Show first 3 dates and last 3 dates
						const datesToShow =
							sortedDates.length > 6
								? [
										...sortedDates.slice(0, 3),
										'...',
										...sortedDates.slice(-3)
								  ]
								: sortedDates;

						datesToShow.forEach((date) => {
							if (date === '...') {
								output += `\n*... ${sortedDates.length - 6} more dates ...*\n\n`;
								return;
							}

							const dateItems = groupedByDate[date];
							const formattedDate =
								date.length === 8
									? `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)}`
									: date;

							output += `### ${formattedDate}\n\n`;

							dateItems.forEach((item: any, index: number) => {
								const timestamp = item.timestamp
									? new Date(parseInt(item.timestamp) * 1000)
											.toISOString()
											.replace('T', ' ')
											.substring(0, 16)
									: 'N/A';
								const indicator = item.act_desc || 'Unknown Indicator';
								const star = item.star || 0;
								const importance = '⭐'.repeat(star);

								output += `#### ${index + 1}. ${indicator} ${importance}\n\n`;
								output += `- **Release Time**: ${timestamp}\n`;

								if (item.data_kv && item.data_kv.length > 0) {
									const dataKv = item.data_kv;
									dataKv.forEach((kv: any) => {
										const key = kv.key || 'N/A';
										const value = kv.value || '--';
										output += `- **${key}**: ${value}\n`;
									});
								}

								if (item.url) {
									output += `- **Details**: ${item.url}\n`;
								}

								output += '\n';
							});
						});

						output += '\n';
					});

					return output;
				}
				throw new Error(
					`API returned error: ${result.message || 'Unknown error'}`
				);
			}
			throw new Error(
				`Failed to fetch macro data: HTTP ${response.status}`
			);
		} catch (error) {
			if (error instanceof Error) {
				throw error;
			}
			throw new Error('Failed to fetch macro data: Unknown error');
		}
	}
});

/**
 * Get stock fields in batch (for multiple stocks/indices)
 * 批量获取股票字段数据（支持多个股票/指数）
 */
export const getBatchStockFieldsTool = createMastraTool({
  category: 'stock-global',
	id: 'get_batch_stock_fields_lbk',
	description:
		'Batch query real-time quotes for multiple stocks or indices (up to 20). Supports HK stocks, US stocks, and global indices. Returns current price, change, volume, market cap, and other key metrics.',
	outputSchema: z.object({
		count: z.number(),
		quotes: z.array(z.any()).describe('Real-time quotes')
	}).describe('Batch stock fields data'),
	inputSchema: z.object({
		securities: z.array(z.string()).describe('Array of security identifiers in counter_id format. Examples: ST/US/AAPL, ST/HK/00700, IX/US/.DJI, IX/HK/HSI. Maximum 20 items')
	}).describe('Tool input parameters'),
	execute: async ({ context }) => {
		const { securities } = context;

		if (!securities || !Array.isArray(securities) || securities.length === 0) {
			throw new Error('Securities array is required and cannot be empty');
		}

		if (securities.length > 20) {
			throw new Error('Maximum 20 securities allowed per request');
		}

		try {
			// Construct request body
			const requestBody = {
				securities: securities.map((counterId: string, index: number) => ({
					counter_id: counterId,
					index: index
				})),
				fields: [1, 2, 4, 111] // Standard fields: trade_status, last_done, prev_close, stock_name
			};

			const url = 'https://m.lbkrs.com/api/forward/v2/quote/stock/fields';

			const response = await requestUrl({
				url,
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json'
				},
				body: JSON.stringify(requestBody)
			});

			if (response.status === 200) {
				const result = JSON.parse(response.text);
				if (result.code === 0 && result.data) {
					const securitiesData = result.data.securities || [];

					if (securitiesData.length === 0) {
						return 'No data returned for the requested securities.';
					}

					let output = '# Batch Stock Fields Query\n\n';
					output += `**Total Securities**: ${securitiesData.length}\n\n`;

					securitiesData.forEach((security: any, index: number) => {
						const counterId = security.counter_id || 'Unknown';
						const field = security.field || {};
						const isDelayed = security.latency || false;

						output += `## ${index + 1}. ${field.stock_name || counterId}\n\n`;
						output += `- **Counter ID**: ${counterId}\n`;
						output += `- **Data Status**: ${isDelayed ? 'Delayed ⏰' : 'Real-time ✅'}\n`;

						const lastDone = field.last_done || '--';
						const prevClose = field.prev_close || '--';
						const tradeStatus = field.trade_status || 0;
						const statusText =
							tradeStatus === 201 ? 'Closed' : tradeStatus === 200 ? 'Trading' : 'Unknown';

						output += `- **Current Price**: ${lastDone}\n`;
						output += `- **Previous Close**: ${prevClose}\n`;
						output += `- **Trade Status**: ${statusText}\n`;

						// Calculate change
						if (lastDone !== '--' && prevClose !== '--') {
							const change = parseFloat(lastDone) - parseFloat(prevClose);
							const changePercent =
								(change / parseFloat(prevClose)) * 100;
							output += `- **Change**: ${change >= 0 ? '+' : ''}${change.toFixed(2)} (${change >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)\n`;
						}

						if (field.market_cap) {
							output += `- **Market Cap**: ${field.market_cap}\n`;
						}

						if (field.currency) {
							output += `- **Currency**: ${field.currency}\n`;
						}

						if (security.sub_market) {
							output += `- **Sub Market**: ${security.sub_market}\n`;
						}

						output += '\n';
					});

					return output;
				}
				throw new Error(
					`API returned error: ${result.message || 'Unknown error'}`
				);
			}
			throw new Error(
				`Failed to fetch batch stock fields: HTTP ${response.status}`
			);
		} catch (error) {
			if (error instanceof Error) {
				throw error;
			}
			throw new Error('Failed to fetch batch stock fields: Unknown error');
		}
	}
});

/**
 * Get trading heat ranking (hot stocks)
 * 获取交易热度排行榜（热门股票）
 */
export const getTradingHeatRankingTool = createMastraTool({
  category: 'stock-global',
	id: 'get_trading_heat_ranking_lbk',
	description:
		'Get trading heat ranking (hot stocks) for HK or US market. Returns most actively traded stocks with real-time price, volume, market cap, turnover rate, and key metrics. Shows which stocks are currently most popular among traders.',
	outputSchema: z.object({
		market: z.string(),
		hot_stocks: z.array(z.any()).describe('Most actively traded stocks')
	}).describe('Stock trading heat ranking data'),
	inputSchema: z.object({
		market: z.enum(['US', 'HK']).describe('Market type: US for US stocks, HK for Hong Kong stocks'),
		limit: z.number().describe('Number of stocks to return (1-50). Default is 20')
	}).describe('Tool input parameters'),
	execute: async ({ context }) => {
		const { market, limit = 20 } = context;

		if (!market) {
			throw new Error('Missing required parameter: market');
		}

		const marketKey = market === 'US' ? 'ib_trade_heat-us' : 'ib_trade_heat-hk';

		try {
			const url = `https://m.lbkrs.com/api/forward/v1/ranklist/lb/lists?key=${marketKey}`;

			const response = await requestUrl({
				url,
				method: 'GET',
				headers: {
					Accept: 'application/json'
				}
			});

			if (response.status === 200) {
				const result = JSON.parse(response.text);
				if (result.code === 0 && result.data) {
					const lists = result.data.lists || [];

					if (lists.length === 0) {
						return `No trading heat ranking data available for ${market} market.`;
					}

					// Limit results
					const limitedLists = lists.slice(0, Math.min(Number(limit), lists.length));

					let output = `# ${market} Market - Trading Heat Ranking\n\n`;
					output += `**Total Stocks**: ${limitedLists.length} (showing top ${Math.min(Number(limit), lists.length)})\n`;
					output += `**Data Source**: LongBridge Trading Heat Index\n\n`;

					limitedLists.forEach((stock: any, index: number) => {
						const name = stock.name || 'Unknown';
						const code = stock.code || 'N/A';
						const lastDone = stock.last_done || '--';
						const chg = stock.chg ? (parseFloat(stock.chg) * 100).toFixed(2) : '--';
						const change = stock.change || '--';
						const balance = stock.balance || '--';
						const turnoverRate = stock.turnover_rate
							? (parseFloat(stock.turnover_rate) * 100).toFixed(2)
							: '--';
						const marketCap = stock.market_cap || '--';
						const intro = stock.intro || '';

						output += `## ${index + 1}. ${name} (${code})\n\n`;
						
						if (intro) {
							output += `> ${intro}\n\n`;
						}

						output += `- **Current Price**: ${lastDone}`;
						if (chg !== '--') {
							const chgNum = parseFloat(chg);
							const arrow = chgNum > 0 ? '🔺' : chgNum < 0 ? '🔻' : '➡️';
							output += ` ${arrow} ${chgNum > 0 ? '+' : ''}${chg}%`;
							if (change !== '--') {
								output += ` (${chgNum > 0 ? '+' : ''}${change})`;
							}
						}
						output += '\n';

						output += `- **Turnover**: ${balance}\n`;
						output += `- **Turnover Rate**: ${turnoverRate}%\n`;
						output += `- **Market Cap**: ${marketCap}\n`;

						if (stock.industry) {
							output += `- **Industry**: ${stock.industry}\n`;
						}

						if (stock.total_amount) {
							output += `- **Volume**: ${stock.total_amount}\n`;
						}

						if (stock.pb_ttm) {
							output += `- **P/B (TTM)**: ${stock.pb_ttm}\n`;
						}

						// Performance metrics
						const perfMetrics = [];
						if (stock.five_day_chg) {
							const chg5d = (parseFloat(stock.five_day_chg) * 100).toFixed(2);
							perfMetrics.push(`5D: ${parseFloat(chg5d) > 0 ? '+' : ''}${chg5d}%`);
						}
						if (stock.ten_day_chg) {
							const chg10d = (parseFloat(stock.ten_day_chg) * 100).toFixed(2);
							perfMetrics.push(`10D: ${parseFloat(chg10d) > 0 ? '+' : ''}${chg10d}%`);
						}
						if (stock.this_year_chg) {
							const chgYtd = (parseFloat(stock.this_year_chg) * 100).toFixed(2);
							perfMetrics.push(`YTD: ${parseFloat(chgYtd) > 0 ? '+' : ''}${chgYtd}%`);
						}

						if (perfMetrics.length > 0) {
							output += `- **Performance**: ${perfMetrics.join(' | ')}\n`;
						}

						output += '\n';
					});

					return output;
				}
				throw new Error(
					`API returned error: ${result.message || 'Unknown error'}`
				);
			}
			throw new Error(
				`Failed to fetch trading heat ranking: HTTP ${response.status}`
			);
		} catch (error) {
			if (error instanceof Error) {
				throw error;
			}
			throw new Error('Failed to fetch trading heat ranking: Unknown error');
		}
	}
});

/**
 * Get stock events (news and updates)
 * 获取股票事件（新闻和动态）
 */
export const getStockEventsTool = createMastraTool({
  category: 'stock-global',
	id: 'get_stock_events_lbk',
	description:
		'Get recent events, news, and updates for one or multiple stocks. Returns company-specific events such as product launches, regulatory updates, partnerships, financial reports, and other significant news. Supports HK and US stocks.',
	outputSchema: z.object({
		count: z.number(),
		events: z.array(z.any()).describe('Recent events list')
	}).describe('Stock events data'),
	inputSchema: z.object({
		counter_ids: z.array(z.string()).describe('Array of counter IDs (ST/{market}/{symbol}). Examples: ST/US/AAPL, ST/HK/00700. Maximum 10 stocks'),
		limit: z.number().describe('Number of events to return per stock (1-50). Default is 20')
	}).describe('Tool input parameters'),
	execute: async ({ context }) => {
		const { counter_ids, limit = 20 } = context;

		if (!counter_ids || !Array.isArray(counter_ids) || counter_ids.length === 0) {
			throw new Error('counter_ids array is required and cannot be empty');
		}

		if (counter_ids.length > 10) {
			throw new Error('Maximum 10 stocks allowed per request');
		}

		try {
			const requestBody = {
				counter_ids: counter_ids
			};

			const url = 'https://m.lbkrs.com/api/forward/v1/event/events';

			const response = await requestUrl({
				url,
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json'
				},
				body: JSON.stringify(requestBody)
			});

			if (response.status === 200) {
				const result = JSON.parse(response.text);
				if (result.code === 0 && result.data) {
					const events = result.data.events || [];

					if (events.length === 0) {
						return 'No events found for the requested stocks.';
					}

					// Limit events
					const limitedEvents = events.slice(0, Math.min(Number(limit), events.length));

					let output = '# Stock Events\n\n';
					output += `**Total Events**: ${limitedEvents.length} (showing top ${Math.min(Number(limit), events.length)})\n`;
					output += `**Stocks Tracked**: ${counter_ids.length}\n\n`;

					// Group events by stock if multiple stocks
					if (counter_ids.length > 1) {
						const eventsByStock: Record<string, any[]> = {};
						
						limitedEvents.forEach((event: any) => {
							const stockCounterIds = event.counter_ids || [];
							stockCounterIds.forEach((counterId: string) => {
								if (counter_ids.includes(counterId)) {
									if (!eventsByStock[counterId]) {
										eventsByStock[counterId] = [];
									}
									eventsByStock[counterId].push(event);
								}
							});
						});

						// Display events grouped by stock
						Object.keys(eventsByStock).forEach((counterId) => {
							const stockEvents = eventsByStock[counterId];
							output += `## ${counterId}\n\n`;
							output += `**Events**: ${stockEvents.length}\n\n`;

							stockEvents.forEach((event: any, index: number) => {
								const title = event.title || 'Untitled Event';
								const issuedAt = event.issued_at
									? new Date(parseInt(event.issued_at) * 1000)
											.toISOString()
											.replace('T', ' ')
											.substring(0, 16)
									: 'N/A';
								const score = event.score || 0;
								const importance = score >= 5 ? '🔥' : score >= 3 ? '⭐' : '';

								output += `### ${index + 1}. ${title} ${importance}\n\n`;
								output += `- **Time**: ${issuedAt}\n`;
								output += `- **Score**: ${score.toFixed(1)}/10\n`;

								if (event.summary) {
									output += `- **Summary**: ${event.summary}\n`;
								}

								if (event.overview) {
									output += `- **Overview**: ${event.overview}\n`;
								}

								if (event.category) {
									output += `- **Category**: ${event.category}\n`;
								}

								output += '\n';
							});
						});
					} else {
						// Single stock - simpler display
						limitedEvents.forEach((event: any, index: number) => {
							const title = event.title || 'Untitled Event';
							const issuedAt = event.issued_at
								? new Date(parseInt(event.issued_at) * 1000)
										.toISOString()
										.replace('T', ' ')
										.substring(0, 16)
								: 'N/A';
							const score = event.score || 0;
							const importance = score >= 5 ? '🔥' : score >= 3 ? '⭐' : '';

							output += `## ${index + 1}. ${title} ${importance}\n\n`;
							output += `- **Time**: ${issuedAt}\n`;
							output += `- **Importance Score**: ${score.toFixed(1)}/10\n`;

							if (event.summary) {
								output += `- **Summary**: ${event.summary}\n`;
							}

							if (event.overview) {
								output += `- **Overview**: ${event.overview}\n`;
							}

							if (event.category) {
								output += `- **Category**: ${event.category}\n`;
							}

							if (event.counter_ids && event.counter_ids.length > 1) {
								output += `- **Related Stocks**: ${event.counter_ids.join(', ')}\n`;
							}

							output += '\n';
						});
					}

					return output;
				}
				throw new Error(
					`API returned error: ${result.message || 'Unknown error'}`
				);
			}
			throw new Error(
				`Failed to fetch stock events: HTTP ${response.status}`
			);
		} catch (error) {
			if (error instanceof Error) {
				throw error;
			}
			throw new Error('Failed to fetch stock events: Unknown error');
		}
	}
});

/**
 * Tool: Get Market Indices Quotes
 * Fetches real-time quotes for multiple market indices at once
 * API: POST https://m.lbkrs.com/api/forward/v2/quote/stock/fields
 * Supports US, HK, and CN market indices
 */
export const getMarketIndicesQuotesTool = createMastraTool({
  category: 'stock-global',
	id: 'get_market_indices_quotes_lbk',
	description:
		'Get real-time quotes for multiple market indices in one request. Returns current price, previous close, price change, and trading status for major global market indices. Useful for comparing market performance across different regions (US, Hong Kong, China Mainland). IMPORTANT: This tool requires at least one index counter_id in the indices array - it cannot be called with empty parameters.',
	outputSchema: z.object({
		count: z.number(),
		quotes: z.array(z.any()).describe('Index quotes')
	}).describe('Market indices real-time quotes'),
	inputSchema: z.object({
		indices: z.array(z.string())
			.min(1)
			.max(20)
			.describe(`REQUIRED: Array of 1-20 index counter_ids to fetch quotes for. Each counter_id must start with "IX/" and follow the format "IX/{MARKET}/{SYMBOL}".

**Common US Indices:**
- "IX/US/.DJI" - Dow Jones Industrial Average (道琼斯工业平均指数)
- "IX/US/.IXIC" - NASDAQ Composite (纳斯达克综合指数)
- "IX/US/.SPX" - S&P 500 Index (标普500指数)
- "IX/US/.NDX" - NASDAQ 100 Index (纳斯达克100指数)

**Common Hong Kong Indices:**
- "IX/HK/HSI" - Hang Seng Index (恒生指数)
- "IX/HK/HSCEI" - Hang Seng China Enterprises Index (国企指数/H股指数)
- "IX/HK/HSTECH" - Hang Seng Tech Index (恒生科技指数)

**Common China Mainland Indices:**
- "IX/SH/000001" - Shanghai Composite Index (上证综合指数)
- "IX/SZ/399001" - Shenzhen Component Index (深证成指)
- "IX/SZ/399006" - ChiNext Index (创业板指数)
- "IX/SH/000300" - CSI 300 Index (沪深300指数)

**Example Usage:**
- For comparing major US markets: ["IX/US/.DJI", "IX/US/.IXIC", "IX/US/.SPX"]
- For Hong Kong market overview: ["IX/HK/HSI", "IX/HK/HSCEI", "IX/HK/HSTECH"]
- For China mainland markets: ["IX/SH/000001", "IX/SZ/399001", "IX/SZ/399006"]
- For global market comparison: ["IX/US/.SPX", "IX/HK/HSI", "IX/SH/000001"]

**CRITICAL: You MUST provide at least one counter_id. Do NOT pass an empty array.**`)
	}).describe('Tool input parameters - MUST include at least one index counter_id'),
	execute: async ({ context }) => {
		try {
			const { indices } = context;
			// Validate indices array
			if (!indices || indices.length === 0) {
				throw new Error('At least one index counter_id is required');
			}

			if (indices.length > 20) {
				throw new Error('Maximum 20 indices allowed per request');
			}

			// Validate counter_id format (should start with IX/)
			const invalidIds = indices.filter(id => !id.startsWith('IX/'));
			if (invalidIds.length > 0) {
				throw new Error(
					`Invalid counter_ids (must start with IX/): ${invalidIds.join(', ')}`
				);
			}

			// Prepare request body
			const securitiesParam = indices.map((id, index) => ({
				counter_id: id,
				index: 0
			}));

			const requestBody = {
				securities: securitiesParam,
				fields: [1, 2, 4, 111] // Fields: trade_status, last_done, prev_close, stock_name
			};

			const response = await requestUrl({
				url: 'https://m.lbkrs.com/api/forward/v2/quote/stock/fields',
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-app-id': 'longport',
					'x-platform': 'web',
					'x-prefer-language': 'zh-CN'
				},
				body: JSON.stringify(requestBody),
				throw: false
			});

			if (response.status !== 200) {
				throw new Error(`HTTP error ${response.status}`);
			}

			const data = JSON.parse(response.text);

			if (!data || data.code !== 0) {
				throw new Error(
					`API error: ${data?.message || 'Unknown error'}`
				);
			}

			const securities = data.data?.securities;

			if (!securities || securities.length === 0) {
				return 'No data available for the requested indices.';
			}

			// Format the output
			let output = '## 📊 Market Indices Quotes\n\n';

			for (const security of securities) {
				const field = security.field;
				const name = field.stock_name || security.counter_id;
				const lastDone = parseFloat(field.last_done);
				const prevClose = parseFloat(field.prev_close);
				const change = lastDone - prevClose;
				const changePercent = ((change / prevClose) * 100).toFixed(2);

				// Trade status indicator
				let statusEmoji = '';
				const tradeStatus = field.trade_status;
				if (tradeStatus === 201) {
					statusEmoji = '🟢'; // Open/Trading
				} else if (tradeStatus === 108) {
					statusEmoji = '🔴'; // Closed
				}

				// Price change indicator
				let changeEmoji = '';
				if (change > 0) {
					changeEmoji = '📈';
				} else if (change < 0) {
					changeEmoji = '📉';
				} else {
					changeEmoji = '➡️';
				}

				// Latency indicator
				const latencyBadge = security.latency ? '⏱️ Delayed' : '⚡ Real-time';

				output += `### ${statusEmoji} ${name}\n`;
				output += `**Counter ID**: ${security.counter_id}\n`;
				output += `**Sub-Market**: ${security.sub_market}\n`;
				output += `**Data Type**: ${latencyBadge}\n\n`;
				output += `**Current Price**: ${lastDone.toFixed(2)}\n`;
				output += `**Previous Close**: ${prevClose.toFixed(2)}\n`;
				const changePercentNum = parseFloat(changePercent);
				output += `**Change**: ${changeEmoji} ${change > 0 ? '+' : ''}${change.toFixed(2)} (${changePercentNum > 0 ? '+' : ''}${changePercent}%)\n\n`;

				// Trade status description
				let statusText = '';
				if (tradeStatus === 201) {
					statusText = 'Market Open';
				} else if (tradeStatus === 108) {
					statusText = 'Market Closed';
				} else {
					statusText = `Status: ${tradeStatus}`;
				}
				output += `**Status**: ${statusText}\n`;

				output += '\n---\n\n';
			}

			// Add summary
			output += '### 📈 Summary\n\n';
			const upCount = securities.filter(
				(s: any) => parseFloat(s.field.last_done) > parseFloat(s.field.prev_close)
			).length;
			const downCount = securities.filter(
				(s: any) => parseFloat(s.field.last_done) < parseFloat(s.field.prev_close)
			).length;
			const flatCount = securities.filter(
				(s: any) => parseFloat(s.field.last_done) === parseFloat(s.field.prev_close)
			).length;

			output += `- **Up**: ${upCount} 📈\n`;
			output += `- **Down**: ${downCount} 📉\n`;
			output += `- **Flat**: ${flatCount} ➡️\n`;
			output += `- **Total Indices**: ${securities.length}\n`;

			return output;
		} catch (error) {
			if (error instanceof Error) {
				throw error;
			}
			throw new Error(
				'Failed to fetch market indices quotes: Unknown error'
			);
		}
	}
});

/**
 * Tool: Get Market Indices Sample Timeshares
 * Fetches intraday minute-by-minute price data for multiple market indices
 * API: POST https://m.lbkrs.com/api/forward/v1/quote/stock/sampletimeshares
 * Supports US, HK, and CN market indices
 */
export const getMarketIndicesSampleTimesharesTool = createMastraTool({
  category: 'stock-global',
	id: 'get_market_indices_sample_timeshares_lbk',
	description:
		'Get intraday minute-by-minute price data for multiple market indices. Returns detailed timeshare data showing price changes throughout the trading day. Useful for analyzing intraday market trends and movements for major indices like Dow Jones, NASDAQ, S&P 500, Hang Seng, Shanghai Composite, etc.',
	outputSchema: z.object({
		count: z.number(),
		timeshares: z.array(z.any()).describe('Minute-by-minute data')
	}).describe('Market indices intraday timeshares sample'),
	inputSchema: z.object({
		indices: z.array(z.string()).describe('Array of index counter_ids to fetch timeshare data for. Examples: "IX/US/.DJI" (Dow Jones), "IX/US/.IXIC" (NASDAQ), "IX/US/.SPX" (S&P 500), "IX/HK/HSI" (Hang Seng), "IX/HK/HSCEI" (H-Share), "IX/HK/HSTECH" (Tech), "IX/SH/000001" (Shanghai), "IX/SZ/399001" (Shenzhen), "IX/SZ/399006" (ChiNext)')
	}).describe('Tool input parameters'),
	execute: async ({ context }) => {
		try {
			const { indices } = context;
			// Validate indices array
			if (!indices || indices.length === 0) {
				throw new Error('At least one index counter_id is required');
			}

			if (indices.length > 12) {
				throw new Error('Maximum 12 indices allowed per request');
			}

			// Validate counter_id format (should start with IX/)
			const invalidIds = indices.filter(id => !id.startsWith('IX/'));
			if (invalidIds.length > 0) {
				throw new Error(
					`Invalid counter_ids (must start with IX/): ${invalidIds.join(', ')}`
				);
			}

			// Prepare request body
			const securitiesParam = indices.map((id, index) => ({
				counter_id: id,
				index: 0
			}));

			const requestBody = {
				securities: securitiesParam
			};

			const response = await requestUrl({
				url: 'https://m.lbkrs.com/api/forward/v1/quote/stock/sampletimeshares',
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-app-id': 'longport',
					'x-platform': 'web',
					'x-prefer-language': 'zh-CN'
				},
				body: JSON.stringify(requestBody),
				throw: false
			});

			if (response.status !== 200) {
				throw new Error(`HTTP error ${response.status}`);
			}

			const data = JSON.parse(response.text);

			if (!data || data.code !== 0) {
				throw new Error(
					`API error: ${data?.message || 'Unknown error'}`
				);
			}

			const securities = data.data?.securities;

			if (!securities || securities.length === 0) {
				return 'No timeshare data available for the requested indices.';
			}

			// Format the output
			let output = '## 📈 Market Indices Intraday Timeshares\n\n';

			for (const security of securities) {
				const counterId = security.counter_id;
				const timeshares = security.timeshares;
				const latencyBadge = security.latency ? '⏱️ Delayed' : '⚡ Real-time';

				if (!timeshares || !timeshares.minutes || timeshares.minutes.length === 0) {
					output += `### ${counterId}\n`;
					output += `**Data Type**: ${latencyBadge}\n`;
					output += `❌ No timeshare data available\n\n---\n\n`;
					continue;
				}

				const basePrice = parseFloat(timeshares.base_price);
				const minutes = timeshares.minutes;
				const minutesCount = timeshares.minutes_count || minutes.length;

				// Get first and last price for daily range
				const firstPrice = parseFloat(minutes[0].price);
				const lastPrice = parseFloat(minutes[minutes.length - 1].price);
				const dayChange = lastPrice - basePrice;
				const dayChangePercent = ((dayChange / basePrice) * 100).toFixed(2);

				// Calculate high and low
				let high = firstPrice;
				let low = firstPrice;
				for (const minute of minutes) {
					const price = parseFloat(minute.price);
					if (price > high) high = price;
					if (price < low) low = price;
				}

				// Price change indicator
				let changeEmoji = '';
				if (dayChange > 0) {
					changeEmoji = '📈';
				} else if (dayChange < 0) {
					changeEmoji = '📉';
				} else {
					changeEmoji = '➡️';
				}

				output += `### ${counterId}\n`;
				output += `**Data Type**: ${latencyBadge}\n`;
				output += `**Base Price** (Previous Close): ${basePrice.toFixed(2)}\n`;
				output += `**Current Price**: ${lastPrice.toFixed(2)}\n`;
				const dayChangePercentNum = parseFloat(dayChangePercent);
				output += `**Day Change**: ${changeEmoji} ${dayChange > 0 ? '+' : ''}${dayChange.toFixed(2)} (${dayChangePercentNum > 0 ? '+' : ''}${dayChangePercent}%)\n`;
				output += `**Day High**: ${high.toFixed(2)}\n`;
				output += `**Day Low**: ${low.toFixed(2)}\n`;
				output += `**Data Points**: ${minutesCount} minutes\n\n`;

				// Show sample of recent prices (last 10 data points)
				output += `**Recent Price Movement** (last 10 minutes):\n`;
				const recentMinutes = minutes.slice(-10);
				for (const minute of recentMinutes) {
					const price = parseFloat(minute.price);
					const timestamp = new Date(parseInt(minute.timestamp) * 1000);
					const timeStr = timestamp.toLocaleTimeString('zh-CN', {
						hour: '2-digit',
						minute: '2-digit',
						hour12: false
					});
					const priceChange = price - basePrice;
					const changePercent = ((priceChange / basePrice) * 100).toFixed(2);
					const changePercentNum = parseFloat(changePercent);
					const indicator = priceChange > 0 ? '↗' : priceChange < 0 ? '↘' : '→';
					
					output += `- ${timeStr}: ${price.toFixed(2)} ${indicator} ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)} (${changePercentNum > 0 ? '+' : ''}${changePercent}%)\n`;
				}

				output += '\n---\n\n';
			}

			// Add summary
			output += '### 📊 Summary\n\n';
			const securitiesWithData = securities.filter(
				(s: any) => s.timeshares && s.timeshares.minutes && s.timeshares.minutes.length > 0
			);

			const upCount = securitiesWithData.filter((s: any) => {
				const basePrice = parseFloat(s.timeshares.base_price);
				const lastPrice = parseFloat(s.timeshares.minutes[s.timeshares.minutes.length - 1].price);
				return lastPrice > basePrice;
			}).length;

			const downCount = securitiesWithData.filter((s: any) => {
				const basePrice = parseFloat(s.timeshares.base_price);
				const lastPrice = parseFloat(s.timeshares.minutes[s.timeshares.minutes.length - 1].price);
				return lastPrice < basePrice;
			}).length;

			const flatCount = securitiesWithData.filter((s: any) => {
				const basePrice = parseFloat(s.timeshares.base_price);
				const lastPrice = parseFloat(s.timeshares.minutes[s.timeshares.minutes.length - 1].price);
				return lastPrice === basePrice;
			}).length;

			output += `- **Up**: ${upCount} 📈\n`;
			output += `- **Down**: ${downCount} 📉\n`;
			output += `- **Flat**: ${flatCount} ➡️\n`;
			output += `- **Total Indices**: ${securities.length}\n`;
			output += `- **Indices with Data**: ${securitiesWithData.length}\n`;

			return output;
		} catch (error) {
			if (error instanceof Error) {
				throw error;
			}
			throw new Error(
				'Failed to fetch market indices sample timeshares: Unknown error'
			);
		}
	}
});

/**
 * Tool: Get Events by Targets
 * Fetches events filtered by target type and target IDs
 * API: POST https://m.lbkrs.com/api/forward/v1/event/events/by_targets
 * Useful for getting macro data events, economic calendar events
 */
export const getEventsByTargetsTool = createMastraTool({
  category: 'stock-global',
	id: 'get_events_by_targets_lbk',
	description:
		'Get events filtered by target type and target IDs. Useful for fetching macro economic data events, economic calendar events, and data release schedules. Returns events with title, issued date, category, related indices, and optional scores. Supports filtering by macrodata target type with specific target IDs.',
	outputSchema: z.object({
		target_type: z.string(),
		count: z.number(),
		events: z.array(z.any()).describe('Event list')
	}).describe('Events filtered by targets'),
	inputSchema: z.object({
		target_type: z.enum(['macrodata']).describe('The type of target to filter events by. Currently supports "macrodata" for macro economic data events.'),
		target_ids: z.array(z.string()).describe('Array of target IDs to fetch events for. For macrodata type, these are numeric IDs representing specific economic indicators. Multiple IDs can be provided to fetch events for multiple indicators at once.')
	}).describe('Tool input parameters'),
	execute: async ({ context }) => {
		try {
			const { target_type, target_ids } = context;
			// Validate inputs
			if (!target_type) {
				throw new Error('target_type is required');
			}

			if (!target_ids || target_ids.length === 0) {
				throw new Error('At least one target_id is required');
			}

			if (target_ids.length > 50) {
				throw new Error('Maximum 50 target_ids allowed per request');
			}

			// Prepare request body
			const requestBody = {
				targets: [
					{
						target_type: target_type,
						target_id: target_ids
					}
				]
			};

			const response = await requestUrl({
				url: 'https://m.lbkrs.com/api/forward/v1/event/events/by_targets',
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-app-id': 'longport',
					'x-platform': 'web',
					'x-prefer-language': 'zh-CN'
				},
				body: JSON.stringify(requestBody),
				throw: false
			});

			if (response.status !== 200) {
				throw new Error(`HTTP error ${response.status}`);
			}

			const data = JSON.parse(response.text);

			if (!data || data.code !== 0) {
				throw new Error(
					`API error: ${data?.message || 'Unknown error'}`
				);
			}

			const events = data.data?.events;

			if (!events || events.length === 0) {
				return `No events found for target type "${target_type}" with the provided target IDs.`;
			}

			// Format the output
			let output = '## 📅 Events by Targets\n\n';
			output += `**Target Type**: ${target_type}\n`;
			output += `**Total Events**: ${events.length}\n\n`;
			output += '---\n\n';

			// Sort events by issued_at (most recent first)
			const sortedEvents = events.sort(
				(a: any, b: any) => parseInt(b.issued_at) - parseInt(a.issued_at)
			);

			for (const event of sortedEvents) {
				const title = event.title || 'No title';
				const category = event.category || 'Unknown';
				const targetId = event.target_id || 'N/A';
				const targetType = event.target_type || 'N/A';
				const issuedAt = new Date(parseInt(event.issued_at) * 1000);
				const dateStr = issuedAt.toLocaleString('zh-CN', {
					year: 'numeric',
					month: '2-digit',
					day: '2-digit',
					hour: '2-digit',
					minute: '2-digit',
					hour12: false
				});

				// Score indicator (if available)
				let scoreEmoji = '';
				if (event.score) {
					const score = parseFloat(event.score);
					if (score >= 5) {
						scoreEmoji = '🔥';
					} else if (score >= 3) {
						scoreEmoji = '⭐';
					}
				}

				output += `### ${scoreEmoji} ${title}\n\n`;
				output += `**Event ID**: ${event.id}\n`;
				output += `**Category**: ${category}\n`;
				output += `**Target Type**: ${targetType}\n`;
				output += `**Target ID**: ${targetId}\n`;
				output += `**Issued At**: ${dateStr}\n`;

				if (event.score) {
					output += `**Importance Score**: ${event.score}\n`;
				}

				if (event.status !== undefined) {
					output += `**Status**: ${event.status}\n`;
				}

				// Related counter IDs (indices/stocks)
				if (event.counter_ids && event.counter_ids.length > 0) {
					output += `**Related Indices**: ${event.counter_ids.join(', ')}\n`;
				}

				// Summary and overview (if available)
				if (event.summary) {
					output += `\n**Summary**: ${event.summary}\n`;
				}

				if (event.overview) {
					output += `\n**Overview**: ${event.overview}\n`;
				}

				output += '\n---\n\n';
			}

			// Add summary by category
			const categoryCount: { [key: string]: number } = {};
			for (const event of events) {
				const category = event.category || 'Unknown';
				categoryCount[category] = (categoryCount[category] || 0) + 1;
			}

			output += '### 📊 Summary by Category\n\n';
			for (const [category, count] of Object.entries(categoryCount)) {
				output += `- **${category}**: ${count} events\n`;
			}

			// Add target ID breakdown
			const targetIdCount: { [key: string]: number } = {};
			for (const event of events) {
				const targetId = event.target_id || 'N/A';
				targetIdCount[targetId] = (targetIdCount[targetId] || 0) + 1;
			}

			output += '\n### 🎯 Summary by Target ID\n\n';
			const sortedTargetIds = Object.entries(targetIdCount).sort(
				(a, b) => b[1] - a[1]
			);
			for (const [targetId, count] of sortedTargetIds) {
				output += `- **${targetId}**: ${count} event(s)\n`;
			}

			return output;
		} catch (error) {
			if (error instanceof Error) {
				throw error;
			}
			throw new Error(
				'Failed to fetch events by targets: Unknown error'
			);
		}
	}
});

/**
 * Tool for fetching finance calendar events
 * Retrieves macrodata events within a date range, optionally filtered by markets
 */
export const getFinanceCalendarTool = createMastraTool({
  category: 'stock-global',
	id: 'get_finance_calendar_lbk',
	description:
		'Fetch finance calendar events (macrodata) for a specified date range and markets. Returns scheduled economic data releases including previous values, estimates, and actual values.',
	outputSchema: z.object({
		count: z.number(),
		events: z.array(z.any()).describe('Calendar events')
	}).describe('Financial calendar events data'),
	inputSchema: z.object({
		types: z.array(z.enum(['macrodata'])).describe('Types of events to fetch. Currently only "macrodata" is supported.'),
		date: z.string().describe('Start date in YYYY-MM-DD format (e.g., "2025-12-01")'),
		date_end: z.string().describe('End date in YYYY-MM-DD format (e.g., "2025-12-06")'),
		markets: z.array(z.string()).describe('Market codes to filter (e.g., ["US", "HK", "CN"]). Optional - omit to get all markets.'),
		next: z.enum(['later', 'earlier']).describe('Direction for date range query. "later" for future dates, "earlier" for past dates. Default is "later".')
	}).describe('Date range and calendar type parameters'),
	execute: async ({ context }) => {
		try {
			// Validate types
			if (!context.types || context.types.length === 0) {
				throw new Error('At least one type is required');
			}

			// Validate date format
			const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
			if (!dateRegex.test(context.date)) {
				throw new Error('date must be in YYYY-MM-DD format');
			}
			if (!dateRegex.test(context.date_end)) {
				throw new Error('date_end must be in YYYY-MM-DD format');
			}

			// Prepare request body
			const requestBody: any = {
				types: context.types,
				next: context.next || 'later',
				date: context.date,
				date_end: context.date_end,
				newData: true
			};

			// Add markets filter if provided
			if (context.markets && context.markets.length > 0) {
				requestBody.markets = context.markets;
			}

			// Make API request
			const response = await requestUrl({
				url: 'https://m.lbkrs.com/api/forward/v2/stock_info/finance_calendar',
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json, text/plain, */*',
					'x-app-id': 'longport',
					'x-platform': 'web'
				},
				body: JSON.stringify(requestBody)
			});

			if (response.status !== 200) {
				throw new Error(
					`API request failed with status ${response.status}`
				);
			}

			const data = response.json;

			if (data.code !== 0) {
				throw new Error(
					`API error: ${data.message || 'Unknown error'}`
				);
			}

			const calendarData = data.data;
			const eventsList = calendarData.list || [];

			if (eventsList.length === 0) {
				return '📅 No events found for the specified date range and filters.';
			}

			// Format output
			let output = `# 📅 Finance Calendar\n\n`;
			output += `**Date Range**: ${context.date} to ${context.date_end}\n`;
			if (context.markets && context.markets.length > 0) {
				output += `**Markets**: ${context.markets.join(', ')}\n`;
			}
			output += `**Total Days**: ${eventsList.length}\n\n`;
			output += `---\n\n`;

			// Process each date group
			let totalEvents = 0;
			const marketStats: { [key: string]: number } = {};
			const starStats: { [key: number]: number } = {};

			for (const dayGroup of eventsList) {
				const date = dayGroup.date;
				const events = dayGroup.infos || [];

				if (events.length === 0) continue;

				output += `## 📆 ${date}\n\n`;
				output += `**Events**: ${events.length}\n\n`;

				// Sort events by datetime
				events.sort((a: any, b: any) => {
					const timeA = parseInt(a.datetime) || 0;
					const timeB = parseInt(b.datetime) || 0;
					return timeA - timeB;
				});

				for (const event of events) {
					totalEvents++;

					// Update statistics
					const market = event.market || 'Unknown';
					marketStats[market] = (marketStats[market] || 0) + 1;

					const star = event.star || 0;
					if (star > 0) {
						starStats[star] = (starStats[star] || 0) + 1;
					}

					// Star indicator
					let starIndicator = '';
					if (star >= 5) {
						starIndicator = '🔥 ';
					} else if (star >= 3) {
						starIndicator = '⭐ ';
					}

					// Format event info
					output += `### ${starIndicator}${event.content}\n\n`;
					output += `- **Market**: ${event.market}\n`;
					output += `- **Time**: ${event.date}\n`;

					if (star > 0) {
						output += `- **Importance**: ${star}/5\n`;
					}

					// Display data values (previous, estimate, actual)
					if (event.data_kv && event.data_kv.length > 0) {
						output += `- **Values**:\n`;
						for (const kv of event.data_kv) {
							const value = kv.value || '--';
							output += `  - ${kv.key}: ${value}\n`;
						}
					}

					if (event.chart_uid) {
						output += `- **Chart ID**: ${event.chart_uid}\n`;
					}

					if (event.id) {
						output += `- **Event ID**: ${event.id}\n`;
					}

					output += `\n`;
				}

				output += `---\n\n`;
			}

			// Add summary
			output += `## 📊 Summary\n\n`;
			output += `- **Total Events**: ${totalEvents}\n`;
			output += `- **Date Range**: ${context.date} to ${context.date_end}\n\n`;

			// Market breakdown
			if (Object.keys(marketStats).length > 0) {
				output += `### By Market\n\n`;
				const sortedMarkets = Object.entries(marketStats).sort(
					(a, b) => b[1] - a[1]
				);
				for (const [market, count] of sortedMarkets) {
					output += `- **${market}**: ${count} events\n`;
				}
				output += `\n`;
			}

			// Importance breakdown
			if (Object.keys(starStats).length > 0) {
				output += `### By Importance\n\n`;
				const sortedStars = Object.entries(starStats).sort(
					(a, b) => parseInt(b[0]) - parseInt(a[0])
				);
				for (const [star, count] of sortedStars) {
					const indicator =
						parseInt(star) >= 5
							? '🔥'
							: parseInt(star) >= 3
							? '⭐'
							: '•';
					output += `- ${indicator} **${star} stars**: ${count} events\n`;
				}
			}

			return output;
		} catch (error) {
			if (error instanceof Error) {
				throw error;
			}
			throw new Error(
				'Failed to fetch finance calendar: Unknown error'
			);
		}
	}
});

/**
 * Tool for fetching trending social/community topics
 * Retrieves popular posts and discussions from the community platform
 */
export const getSocialTopicsTool = createMastraTool({
  category: 'stock-global',
	id: 'get_social_topics_lbk',
	description:
		'Fetch trending social topics and community posts. Returns popular discussions, market insights, and user-generated content with engagement metrics (likes, comments, shares).',
	outputSchema: z.object({
		count: z.number(),
		topics: z.array(z.any()).describe('Trending topics')
	}).describe('Stock-related social media topics data'),
	inputSchema: z.object({
		limit: z.number().describe('Number of topics to fetch (1-50). Default is 20.')
	}).describe('Pagination parameters for social topics'),
	execute: async ({ context }) => {
		try {
			const limit =
				context.limit !== undefined ? context.limit : 20;

			// Validate limit
			if (limit < 1 || limit > 50) {
				throw new Error('limit must be between 1 and 50');
			}

		// Prepare request body
		const requestBody = {
			limit: limit
		};			// Make API request
			const response = await requestUrl({
				url: 'https://m.lbkrs.com/api/forward/social/dolphin/topics',
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json, text/plain, */*',
					'x-app-id': 'longport',
					'x-platform': 'web'
				},
				body: JSON.stringify(requestBody)
			});

			if (response.status !== 200) {
				throw new Error(
					`API request failed with status ${response.status}`
				);
			}

			const data = response.json;

			if (data.code !== 0) {
				throw new Error(
					`API error: ${data.message || 'Unknown error'}`
				);
			}

			const topicsData = data.data;
			const topics = topicsData.articles || [];

			if (topics.length === 0) {
				return '📱 No trending topics found.';
			}

			// Format output
			let output = `# 📱 Trending Social Topics\n\n`;
			output += `**Total Topics**: ${topics.length}\n\n`;
			output += `---\n\n`;

			// Process each topic
			for (let i = 0; i < topics.length; i++) {
				const topic = topics[i];

				output += `## ${i + 1}. ${topic.title}\n\n`;

				// Author info
				if (topic.author) {
					const author = topic.author;
					let authorInfo = `**Author**: ${author.name}`;
					if (author.cert_scopes && author.cert_scopes.official) {
						authorInfo += ` ✓ (Official)`;
					}
					if (author.followers_count) {
						const followers = parseInt(
							author.followers_count
						).toLocaleString();
						authorInfo += ` · ${followers} followers`;
					}
					output += `${authorInfo}\n\n`;
				}

				// Description
				if (topic.description_html) {
					// Strip HTML tags for cleaner output
					const description = topic.description_html
						.replace(/<[^>]*>/g, '')
						.trim();
					if (description && description.length > 0) {
						// Truncate long descriptions
						const maxLength = 300;
						const truncated =
							description.length > maxLength
								? description.substring(0, maxLength) + '...'
								: description;
						output += `${truncated}\n\n`;
					}
				}

				// Engagement metrics
				output += `**Engagement**:\n`;
				output += `- 👍 Likes: ${topic.likes_count || 0}\n`;
				output += `- 💬 Comments: ${topic.comments_count || 0}\n`;
				output += `- 🔄 Shares: ${topic.shares_count || 0}\n`;
				if (topic.bookmarkes_count) {
					output += `- 🔖 Bookmarks: ${topic.bookmarkes_count}\n`;
				}
				output += `\n`;

				// Related stocks
				if (topic.stocks && topic.stocks.length > 0) {
					output += `**Related Stocks**:\n`;
					for (const stock of topic.stocks.slice(0, 5)) {
						// Limit to 5 stocks
						output += `- ${stock.name} (${stock.code})`;
						if (stock.market) {
							output += ` - ${stock.market}`;
						}
						output += `\n`;
					}
					output += `\n`;
				}

				// Collections/categories
				if (topic.collections && topic.collections.length > 0) {
					const collectionNames = topic.collections
						.map((c: any) => c.name)
						.join(', ');
					output += `**Collections**: ${collectionNames}\n\n`;
				}

				// Published time
				if (topic.published_at) {
					const timestamp = parseInt(topic.published_at);
					const date = new Date(timestamp * 1000);
					output += `**Published**: ${date.toLocaleString('en-US', {
						year: 'numeric',
						month: 'short',
						day: 'numeric',
						hour: '2-digit',
						minute: '2-digit'
					})}\n\n`;
				}

				// Detail URL
				if (topic.web_url) {
					output += `**Link**: ${topic.web_url}\n\n`;
				}

				output += `---\n\n`;
			}

			// Add summary statistics
			output += `## 📊 Summary\n\n`;

			const totalLikes = topics.reduce(
				(sum: number, t: any) => sum + (t.likes_count || 0),
				0
			);
			const totalComments = topics.reduce(
				(sum: number, t: any) => sum + (t.comments_count || 0),
				0
			);
			const totalShares = topics.reduce(
				(sum: number, t: any) => sum + (t.shares_count || 0),
				0
			);

			output += `- **Total Engagement**: ${(
				totalLikes +
				totalComments +
				totalShares
			).toLocaleString()} interactions\n`;
			output += `- **Total Likes**: ${totalLikes.toLocaleString()}\n`;
			output += `- **Total Comments**: ${totalComments.toLocaleString()}\n`;
			output += `- **Total Shares**: ${totalShares.toLocaleString()}\n\n`;

			// Most engaged topic
			const mostEngaged = topics.reduce((prev: any, current: any) => {
				const prevEngagement =
					(prev.likes_count || 0) +
					(prev.comments_count || 0) +
					(prev.shares_count || 0);
				const currentEngagement =
					(current.likes_count || 0) +
					(current.comments_count || 0) +
					(current.shares_count || 0);
				return currentEngagement > prevEngagement ? current : prev;
			}, topics[0]);

			if (mostEngaged) {
				const engagement =
					(mostEngaged.likes_count || 0) +
					(mostEngaged.comments_count || 0) +
					(mostEngaged.shares_count || 0);
				output += `### Most Engaged Topic\n\n`;
				output += `**"${mostEngaged.title}"**\n`;
				output += `- Total Engagement: ${engagement.toLocaleString()} interactions\n`;
				if (mostEngaged.author) {
					output += `- By: ${mostEngaged.author.name}\n`;
				}
			}

			return output;
		} catch (error) {
			if (error instanceof Error) {
				throw error;
			}
			throw new Error('Failed to fetch social topics: Unknown error');
		}
	}
});

/**
 * Tool for fetching security viewing history for a member
 * Retrieves stocks/securities viewed by a specific member with related topics
 */
export const getSecurityViewsTool = createMastraTool({
  category: 'stock-global',
	id: 'get_security_views_lbk',
	description:
		'Fetch security viewing history for a member. Returns stocks/securities that a member has viewed or posted about, along with related topics and engagement metrics. Useful for tracking member interests and research focus.',
	inputSchema: z.object({
		target_type: z.enum(['Member']).describe('Type of target (typically "Member"). Default is "Member".'),
		target_id: z.string().describe('ID of the member to fetch security views for (e.g., "2106669").'),
		limit: z.number().describe('Number of securities to fetch (1-50). Default is 10.')
	}).describe('Tool input parameters'),
	outputSchema: z.object({
		member_id: z.string(),
		count: z.number(),
		securities: z.array(z.any()).describe('Viewed securities')
	}).describe('Security views and analysis data'),
	execute: async ({ context }) => {
		try {
			const targetType = context.target_type || 'Member';
			const limit =
				context.limit !== undefined ? context.limit : 10;

			// Validate limit
			if (limit < 1 || limit > 50) {
				throw new Error('limit must be between 1 and 50');
			}

			// Validate target_id
			if (!context.target_id) {
				throw new Error('target_id is required');
			}

			// Build query parameters
			const params = new URLSearchParams({
				target_type: targetType,
				target_id: context.target_id,
				limit: limit.toString(),
				visited: ''
			});

			// Make API request
			const response = await requestUrl({
				url: `https://m.lbkrs.com/api/forward/social/security_views?${params.toString()}`,
				method: 'GET',
				headers: {
					Accept: 'application/json, text/plain, */*',
					'x-app-id': 'longport',
					'x-platform': 'web'
				}
			});

			if (response.status !== 200) {
				throw new Error(
					`API request failed with status ${response.status}`
				);
			}

			const data = response.json;

			if (data.code !== 0) {
				throw new Error(
					`API error: ${data.message || 'Unknown error'}`
				);
			}

			const viewsData = data.data;
			const securities = viewsData.items || [];
			const total = viewsData.total || 0;

			if (securities.length === 0) {
				return '📊 No security views found for this member.';
			}

			// Format output
			let output = `# 📊 Security Viewing History\n\n`;
			output += `**Target**: ${targetType} ${context.target_id}\n`;
			output += `**Total Securities**: ${total}\n`;
			output += `**Showing**: ${securities.length} securities\n\n`;
			output += `---\n\n`;

			// Process each security
			for (let i = 0; i < securities.length; i++) {
				const security = securities[i];

				// Security header
				output += `## ${i + 1}. ${security.counter_id}\n\n`;

				// Topics count
				output += `**Topics**: ${security.topics_count || 0} posts\n`;
				if (security.year_topics_count) {
					output += `**Year Topics**: ${security.year_topics_count}\n`;
				}

				// Last activity
				if (security.last_topiced_at) {
					const timestamp = parseInt(security.last_topiced_at);
					const date = new Date(timestamp * 1000);
					output += `**Last Activity**: ${date.toLocaleString('en-US', {
						year: 'numeric',
						month: 'short',
						day: 'numeric',
						hour: '2-digit',
						minute: '2-digit'
					})}\n`;
				}

				// Last topic description
				if (security.last_topic_description) {
					output += `**Latest Topic**: ${security.last_topic_description}\n`;
				}

				output += `\n`;

				// Last members who posted
				if (security.last_members && security.last_members.length > 0) {
					output += `**Recent Contributors**:\n`;
					for (const member of security.last_members.slice(0, 3)) {
						// Limit to 3
						let memberInfo = `- ${member.name}`;
						if (member.cert_scopes && member.cert_scopes.official) {
							memberInfo += ` ✓`;
						}
						output += `${memberInfo}\n`;
					}
					output += `\n`;
				}

				// Recent security trends (show up to 5)
				if (
					security.security_trends &&
					security.security_trends.length > 0
				) {
					output += `**Recent Activity Timeline** (last 5):\n`;
					const recentTrends = security.security_trends.slice(-5);
					for (const trend of recentTrends) {
						const date = trend.dt.toString();
						const formattedDate = `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)}`;
						output += `- ${formattedDate}`;
						if (trend.topic_id) {
							output += ` (Topic #${trend.topic_id})`;
						}
						output += `\n`;
					}
					output += `\n`;
				}

				output += `---\n\n`;
			}

			// Add summary statistics
			output += `## 📈 Summary\n\n`;

			const totalTopics = securities.reduce(
				(sum: number, s: any) => sum + (s.topics_count || 0),
				0
			);
			output += `- **Total Posts Across All Securities**: ${totalTopics.toLocaleString()}\n`;
			output += `- **Average Posts per Security**: ${(totalTopics / securities.length).toFixed(1)}\n\n`;

			// Most active security
			const mostActive = securities.reduce((prev: any, current: any) =>
				(current.topics_count || 0) > (prev.topics_count || 0)
					? current
					: prev
			);

			if (mostActive) {
				output += `### Most Active Security\n\n`;
				output += `**${mostActive.counter_id}**\n`;
				output += `- ${mostActive.topics_count || 0} posts\n`;
				if (mostActive.last_topic_description) {
					output += `- Latest: "${mostActive.last_topic_description}"\n`;
				}
			}

			return output;
		} catch (error) {
			if (error instanceof Error) {
				throw error;
			}
			throw new Error(
				'Failed to fetch security views: Unknown error'
			);
		}
	}
});

/**
 * Tool 20: Get Batch Stock Quotes
 * Fetches real-time quotes and minute data for multiple stocks in a single request
 */
export const getBatchStockQuotesTool = createMastraTool({
  category: 'stock-global',
	id: 'get_batch_stock_quotes_lbk',
	description:
		'Fetch real-time quotes and minute-by-minute price data for multiple stocks in a single batch request. Returns comprehensive market data including current prices, trading volume, market cap, P/E ratios, and intraday minute-level price movements. Supports stocks from US, HK, SG, and CN markets. Ideal for monitoring multiple stocks simultaneously or comparing real-time performance across a portfolio.',
	outputSchema: z.object({
		count: z.number(),
		quotes: z.array(z.any()).describe('Stock quotes with minute data')
	}).describe('Batch stock market data'),
	inputSchema: z.object({
		stocks: z.array(z.object({
			counter_id: z.string().describe('Stock identifier in format ST/MARKET/SYMBOL (e.g., "ST/US/NVDA", "ST/HK/9988", "ST/US/TSLA")'),
			last_line_no: z.number().describe('Last line number for minute data (default: 1)'),
			index: z.number().describe('Index for ordering (default: 0)')
		})).describe('Array of stock identifiers to fetch quotes for. Each stock should specify counter_id (e.g., "ST/US/NVDA"), optional last_line_no (default 1), and optional index (default 0).')
	}).describe('Tool input parameters'),
	execute: async ({ context }) => {
		try {
			// Validate stocks array
			if (!context.stocks || context.stocks.length === 0) {
				throw new Error('stocks array cannot be empty');
			}

			if (context.stocks.length > 50) {
				throw new Error('Maximum 50 stocks per request');
			}

			// Validate each stock has counter_id
			for (const stock of context.stocks) {
				if (!stock.counter_id) {
					throw new Error(
						'Each stock must have a counter_id'
					);
				}
			}

			// Prepare request body
			const requestBody = {
				stocks: context.stocks.map((stock) => ({
					counter_id: stock.counter_id,
					last_line_no: stock.last_line_no !== undefined ? stock.last_line_no : 1,
					index: stock.index !== undefined ? stock.index : 0
				}))
			};

			// Make API request
			const response = await requestUrl({
				url: 'https://m.lbkrs.com/api/forward/v2/quote/stocks',
				method: 'POST',
				headers: {
					Accept: 'application/json, text/plain, */*',
					'Content-Type': 'application/json',
					'x-app-id': 'longport',
					'x-platform': 'web'
				},
				body: JSON.stringify(requestBody)
			});

			if (response.status !== 200) {
				throw new Error(
					`API request failed with status ${response.status}`
				);
			}

			const data = response.json;

			if (data.code !== 0) {
				throw new Error(
					`API error: ${data.message || 'Unknown error'}`
				);
			}

			const quotesData = data.data;
			const securities = quotesData.securities || [];

			if (securities.length === 0) {
				return '📊 No stock quotes found.';
			}

			// Format output
			let output = `# 📈 Batch Stock Quotes\n\n`;
			output += `**Stocks Requested**: ${context.stocks.length}\n`;
			output += `**Stocks Retrieved**: ${securities.length}\n\n`;
			output += `---\n\n`;

			// Process each security
			for (let i = 0; i < securities.length; i++) {
				const security = securities[i];
				const prices = security.prices || {};

				// Security header
				output += `## ${i + 1}. ${security.counter_id}\n\n`;

				// Check if delayed data
				if (security.latency) {
					output += `⚠️ **Delayed Data**\n\n`;
				}

				// Current price and change
				const lastDone = parseFloat(prices.last_done || '0');
				const prevClose = parseFloat(prices.prev_close || '0');
				const change = lastDone - prevClose;
				const changePercent =
					prevClose > 0 ? (change / prevClose) * 100 : 0;

				output += `### 💰 Current Price\n\n`;
				output += `- **Last Price**: $${lastDone.toFixed(2)}`;

				if (change !== 0) {
					const indicator = change > 0 ? '📈' : '📉';
					output += ` ${indicator} ${change > 0 ? '+' : ''}${change.toFixed(2)} (${change > 0 ? '+' : ''}${changePercent.toFixed(2)}%)`;
				}
				output += `\n`;

				output += `- **Previous Close**: $${prevClose.toFixed(2)}\n`;

				if (prices.market_price) {
					output += `- **Market Price**: $${parseFloat(prices.market_price).toFixed(2)}\n`;
				}

				// Trading status
				const tradeStatus = prices.trade_status;
				let statusText = 'Unknown';
				if (tradeStatus === 201) {
					statusText = 'Closed 🔴';
				} else if (tradeStatus === 200) {
					statusText = 'Trading 🟢';
				}
				output += `- **Status**: ${statusText}\n\n`;

				// Trading volume and value
				output += `### 📊 Trading Activity\n\n`;
				const amount = parseInt(prices.amount || '0');
				const balance = parseFloat(prices.balance || '0');

				output += `- **Volume**: ${amount.toLocaleString()} shares\n`;
				output += `- **Turnover**: $${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;

				if (prices.turnover_rate) {
					output += `- **Turnover Rate**: ${prices.turnover_rate}%\n`;
				}

				if (prices.inflow) {
					const inflow = parseFloat(prices.inflow);
					const inflowIndicator = inflow > 0 ? '💹' : '💸';
					output += `- **Net Inflow**: ${inflowIndicator} $${inflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
				}

				output += `\n`;

				// Company fundamentals
				output += `### 🏢 Company Info\n\n`;

				const totalShares = parseInt(
					prices.total_shares || '0'
				);
				const circulatingShares = parseInt(
					prices.circulating_shares || '0'
				);

				if (totalShares > 0) {
					output += `- **Total Shares**: ${totalShares.toLocaleString()}\n`;
				}

				if (circulatingShares > 0) {
					output += `- **Circulating Shares**: ${circulatingShares.toLocaleString()}\n`;
				}

				// Market cap
				if (circulatingShares > 0 && lastDone > 0) {
					const marketCap = circulatingShares * lastDone;
					output += `- **Market Cap**: $${(marketCap / 1e9).toFixed(2)}B\n`;
				}

				// Valuation metrics
				if (prices.eps_ttm) {
					const epsTTM = parseFloat(prices.eps_ttm);
					output += `- **EPS (TTM)**: $${epsTTM.toFixed(2)}\n`;

					if (epsTTM > 0) {
						const pe = lastDone / epsTTM;
						output += `- **P/E Ratio**: ${pe.toFixed(2)}\n`;
					}
				}

				if (prices.dps_rate) {
					output += `- **Dividend Rate**: ${prices.dps_rate}%\n`;
				}

				output += `\n`;

				// Historical performance
				output += `### 📅 Historical Performance\n\n`;

				const perfData = [
					{
						label: '1 Week',
						preclose: prices.one_week_preclose
					},
					{
						label: '1 Month',
						preclose: prices.one_month_preclose
					},
					{
						label: '6 Months',
						preclose: prices.six_month_preclose
					},
					{
						label: '1 Year',
						preclose: prices.one_year_preclose
					},
					{
						label: '3 Years',
						preclose: prices.three_year_preclose
					}
				];

				for (const perf of perfData) {
					if (perf.preclose) {
						const prevPrice = parseFloat(perf.preclose);
						const perfChange = lastDone - prevPrice;
						const perfChangePercent =
							prevPrice > 0
								? (perfChange / prevPrice) * 100
								: 0;

						const indicator =
							perfChange > 0 ? '📈' : '📉';
						output += `- **${perf.label}**: ${indicator} ${perfChange > 0 ? '+' : ''}${perfChangePercent.toFixed(2)}% (from $${prevPrice.toFixed(2)})\n`;
					}
				}

				if (prices.ipo_price) {
					const ipoPrice = parseFloat(prices.ipo_price);
					const ipoChange = lastDone - ipoPrice;
					const ipoChangePercent =
						ipoPrice > 0 ? (ipoChange / ipoPrice) * 100 : 0;

					output += `- **Since IPO**: ${ipoChange > 0 ? '📈' : '📉'} ${ipoChange > 0 ? '+' : ''}${ipoChangePercent.toFixed(2)}% (IPO: $${ipoPrice.toFixed(2)})\n`;
				}

				output += `\n`;

				// Minute data summary
				if (security.minutes && security.minutes.length > 0) {
					output += `### ⏱️ Intraday Activity\n\n`;

					const minutes = security.minutes;
					const firstMinute = minutes[0];
					const lastMinute = minutes[minutes.length - 1];

					// Calculate intraday high and low
					let intradayHigh = -Infinity;
					let intradayLow = Infinity;

					for (const minute of minutes) {
						const price = parseFloat(minute.price || '0');
						if (price > 0) {
							intradayHigh = Math.max(
								intradayHigh,
								price
							);
							intradayLow = Math.min(
								intradayLow,
								price
							);
						}
					}

					if (intradayHigh > 0 && intradayLow < Infinity) {
						output += `- **Intraday High**: $${intradayHigh.toFixed(2)}\n`;
						output += `- **Intraday Low**: $${intradayLow.toFixed(2)}\n`;
						output += `- **Intraday Range**: $${(intradayHigh - intradayLow).toFixed(2)} (${((intradayHigh - intradayLow) / intradayLow * 100).toFixed(2)}%)\n`;
					}

					// Opening price
					const openPrice = parseFloat(
						firstMinute.price || '0'
					);
					if (openPrice > 0) {
						output += `- **Open**: $${openPrice.toFixed(2)}\n`;
					}

					output += `- **Minute Data Points**: ${minutes.length}\n`;

					// Last update timestamp
					if (lastMinute.timestamp) {
						const timestamp = parseInt(lastMinute.timestamp);
						const date = new Date(timestamp * 1000);
						output += `- **Last Update**: ${date.toLocaleString('en-US', {
							year: 'numeric',
							month: 'short',
							day: 'numeric',
							hour: '2-digit',
							minute: '2-digit',
							second: '2-digit'
						})}\n`;
					}

					output += `\n`;
				}

				output += `---\n\n`;
			}

			// Add summary statistics
			output += `## 📊 Portfolio Summary\n\n`;

			const totalVolume = securities.reduce((sum, s) => {
				return sum + parseInt(s.prices?.amount || '0');
			}, 0);

			const totalTurnover = securities.reduce((sum, s) => {
				return sum + parseFloat(s.prices?.balance || '0');
			}, 0);

			output += `- **Total Volume**: ${totalVolume.toLocaleString()} shares\n`;
			output += `- **Total Turnover**: $${totalTurnover.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n`;

			// Top performers
			const gainers = securities
				.map((s) => {
					const lastDone = parseFloat(
						s.prices?.last_done || '0'
					);
					const prevClose = parseFloat(
						s.prices?.prev_close || '0'
					);
					const changePercent =
						prevClose > 0
							? ((lastDone - prevClose) / prevClose) * 100
							: 0;

					return {
						counter_id: s.counter_id,
						changePercent
					};
				})
				.sort((a, b) => b.changePercent - a.changePercent);

			if (gainers.length > 0) {
				output += `### 🏆 Top Performer\n\n`;
				const topGainer = gainers[0];
				output += `**${topGainer.counter_id}**: ${topGainer.changePercent > 0 ? '+' : ''}${topGainer.changePercent.toFixed(2)}%\n\n`;

				if (gainers.length > 1) {
					output += `### 📉 Weakest Performer\n\n`;
					const topLoser = gainers[gainers.length - 1];
					output += `**${topLoser.counter_id}**: ${topLoser.changePercent > 0 ? '+' : ''}${topLoser.changePercent.toFixed(2)}%\n`;
				}
			}

			return output;
		} catch (error) {
			if (error instanceof Error) {
				throw error;
			}
			throw new Error(
				'Failed to fetch batch stock quotes: Unknown error'
			);
		}
	}
});

/**
 * Tool 21: Get Global Index Map
 * Fetches global market indices with their visual layout positions
 */
export const getGlobalIndexMapTool = createMastraTool({
  category: 'stock-global',
	id: 'get_global_index_map_lbk',
	description:
		'Fetch global market indices overview with current prices and visual layout coordinates. Returns major market indices from China (Shanghai, Shenzhen), Hong Kong (HSI), US (Nasdaq, Dow Jones), and Singapore (STI) with their last prices, previous close, and position data for visual display. Ideal for getting a quick snapshot of global market performance across different regions.',
	outputSchema: z.object({
		count: z.number(),
		indices: z.array(z.any()).describe('Global market indices')
	}).describe('Global market indices data'),
	inputSchema: z.object({
	}).describe('Tool input parameters'),
	execute: async ({ context }) => {
		try {
			// Make API request
			const response = await requestUrl({
				url: 'https://m.lbkrs.com/api/forward/newmarket/global/index_map',
				method: 'GET',
				headers: {
					Accept: 'application/json, text/plain, */*',
					'x-app-id': 'longport',
					'x-platform': 'web'
				}
			});

			if (response.status !== 200) {
				throw new Error(
					`API request failed with status ${response.status}`
				);
			}

			const data = response.json;

			if (data.code !== 0) {
				throw new Error(
					`API error: ${data.message || 'Unknown error'}`
				);
			}

			const mapData = data.data;
			const indices = mapData.items || [];

			if (indices.length === 0) {
				return '🌍 No global index data available.';
			}

			// Format output
			let output = `# 🌍 Global Market Indices Map\n\n`;
			output += `**Total Indices**: ${indices.length}\n`;
			output += `**Panel Dimensions**: ${mapData.panel_width}x${mapData.panel_height}\n`;

			if (mapData.background) {
				output += `**Background Image**: [View Map](${mapData.background})\n`;
			}

			output += `\n---\n\n`;

			// Group indices by region
			const regions = {
				China: [] as typeof indices,
				HongKong: [] as typeof indices,
				US: [] as typeof indices,
				Singapore: [] as typeof indices,
				Other: [] as typeof indices
			};

			for (const index of indices) {
				const counterId = index.counter_id;
				if (counterId.includes('/SH/') || counterId.includes('/SZ/')) {
					regions.China.push(index);
				} else if (counterId.includes('/HK/')) {
					regions.HongKong.push(index);
				} else if (counterId.includes('/US/')) {
					regions.US.push(index);
				} else if (counterId.includes('/SG/')) {
					regions.Singapore.push(index);
				} else {
					regions.Other.push(index);
				}
			}

			// Calculate overall market sentiment
			let totalGainers = 0;
			let totalLosers = 0;
			let totalUnchanged = 0;

			for (const index of indices) {
				const lastDone = parseFloat(index.last_done || '0');
				const prevClose = parseFloat(index.prev_close || '0');
				const change = lastDone - prevClose;

				if (change > 0) totalGainers++;
				else if (change < 0) totalLosers++;
				else totalUnchanged++;
			}

			// Display summary
			output += `## 📊 Market Overview\n\n`;
			output += `- 🟢 **Up**: ${totalGainers} indices\n`;
			output += `- 🔴 **Down**: ${totalLosers} indices\n`;
			output += `- ⚪ **Unchanged**: ${totalUnchanged} indices\n\n`;

			const sentiment =
				totalGainers > totalLosers
					? '🟢 **Bullish**'
					: totalLosers > totalGainers
					? '🔴 **Bearish**'
					: '⚪ **Mixed**';
			output += `**Overall Sentiment**: ${sentiment}\n\n`;
			output += `---\n\n`;

			// Process each region
			const regionOrder: Array<keyof typeof regions> = [
				'China',
				'HongKong',
				'US',
				'Singapore',
				'Other'
			];

			const regionLabels = {
				China: '🇨🇳 China Mainland',
				HongKong: '🇭🇰 Hong Kong',
				US: '🇺🇸 United States',
				Singapore: '🇸🇬 Singapore',
				Other: '🌏 Other Markets'
			};

			for (const regionKey of regionOrder) {
				const regionIndices = regions[regionKey];
				if (regionIndices.length === 0) continue;

				output += `## ${regionLabels[regionKey]}\n\n`;

				for (const index of regionIndices) {
					const lastDone = parseFloat(index.last_done || '0');
					const prevClose = parseFloat(index.prev_close || '0');
					const change = lastDone - prevClose;
					const changePercent =
						prevClose > 0 ? (change / prevClose) * 100 : 0;

					// Index name and symbol
					output += `### ${index.name} (${index.counter_id})\n\n`;

					// Price information
					output += `**Current**: ${lastDone.toLocaleString(undefined, {
						minimumFractionDigits: 2,
						maximumFractionDigits: 2
					})}`;

					if (change !== 0) {
						const indicator = change > 0 ? '📈' : '📉';
						const changeSign = change > 0 ? '+' : '';
						output += ` ${indicator} ${changeSign}${change.toFixed(2)} (${changeSign}${changePercent.toFixed(2)}%)`;
					} else {
						output += ` ⚪ 0.00 (0.00%)`;
					}
					output += `\n`;

					output += `**Previous Close**: ${prevClose.toLocaleString(undefined, {
						minimumFractionDigits: 2,
						maximumFractionDigits: 2
					})}\n\n`;

					// Visual position data
					output += `**Display Position**:\n`;
					output += `- X: ${index.x}, Y: ${index.y}\n`;
					output += `- Size: ${index.width}×${index.height}\n\n`;
				}
			}

			// Add performance ranking
			output += `---\n\n## 🏆 Performance Ranking\n\n`;

			const rankedIndices = [...indices]
				.map((index) => {
					const lastDone = parseFloat(index.last_done || '0');
					const prevClose = parseFloat(index.prev_close || '0');
					const changePercent =
						prevClose > 0
							? ((lastDone - prevClose) / prevClose) * 100
							: 0;

					return {
						name: index.name,
						counter_id: index.counter_id,
						changePercent,
						change: lastDone - prevClose
					};
				})
				.sort((a, b) => b.changePercent - a.changePercent);

			output += `### 🥇 Top Performers\n\n`;
			for (let i = 0; i < Math.min(3, rankedIndices.length); i++) {
				const idx = rankedIndices[i];
				const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
				output += `${medal} **${idx.name}**: ${idx.changePercent > 0 ? '+' : ''}${idx.changePercent.toFixed(2)}%\n`;
			}

			output += `\n### 🔻 Bottom Performers\n\n`;
			const bottomStart = Math.max(
				0,
				rankedIndices.length - 3
			);
			for (
				let i = rankedIndices.length - 1;
				i >= bottomStart;
				i--
			) {
				const idx = rankedIndices[i];
				output += `📉 **${idx.name}**: ${idx.changePercent > 0 ? '+' : ''}${idx.changePercent.toFixed(2)}%\n`;
			}

			// Add statistics
			output += `\n---\n\n## 📈 Statistics\n\n`;

			const changes = rankedIndices.map((idx) => idx.changePercent);
			const avgChange =
				changes.reduce((sum, val) => sum + val, 0) /
				changes.length;

			output += `- **Average Change**: ${avgChange > 0 ? '+' : ''}${avgChange.toFixed(2)}%\n`;

			const maxGain = rankedIndices[0];
			const maxLoss = rankedIndices[rankedIndices.length - 1];

			output += `- **Biggest Gain**: ${maxGain.name} (${maxGain.changePercent > 0 ? '+' : ''}${maxGain.changePercent.toFixed(2)}%)\n`;
			output += `- **Biggest Loss**: ${maxLoss.name} (${maxLoss.changePercent > 0 ? '+' : ''}${maxLoss.changePercent.toFixed(2)}%)\n`;

			// Market breadth
			const spreadPercent =
				maxGain.changePercent - maxLoss.changePercent;
			output += `- **Market Spread**: ${spreadPercent.toFixed(2)}%\n`;

			return output;
		} catch (error) {
			if (error instanceof Error) {
				throw error;
			}
			throw new Error(
				'Failed to fetch global index map: Unknown error'
			);
		}
	}
});

/**
 * Tool 22: Get Macro Data for Market
 * Fetches upcoming macroeconomic data releases grouped by market region
 */
export const getMacroDataForMarketTool = createMastraTool({
  category: 'stock-global',
	id: 'get_macro_data_for_market_lbk',
	description:
		'Fetch upcoming macroeconomic data releases and indicators for major global markets. Returns scheduled economic data releases grouped by region (US, EU, HK, CN, JP) including indicators like PMI, CPI, unemployment, retail sales, trade balance, etc. Each release shows previous value, forecast estimate, and actual value (when available), along with importance rating (star level). Ideal for tracking economic calendar events and understanding upcoming market-moving data releases.',
	outputSchema: z.object({
		regions: z.array(z.any()).describe('Data by region'),
		count: z.number()
	}).describe('Macroeconomic data for specific markets'),
	inputSchema: z.object({
	}).describe('Tool input parameters'),
	execute: async ({ context }) => {
		try {
			// Make API request
			const response = await requestUrl({
				url: 'https://m.lbkrs.com/api/forward/stock/activity/macro_data_for_market',
				method: 'GET',
				headers: {
					Accept: 'application/json, text/plain, */*',
					'x-app-id': 'longport',
					'x-platform': 'web'
				}
			});

			if (response.status !== 200) {
				throw new Error(
					`API request failed with status ${response.status}`
				);
			}

			const data = response.json;

			if (data.code !== 0) {
				throw new Error(
					`API error: ${data.message || 'Unknown error'}`
				);
			}

			const macroData = data.data;
			const markets = macroData.items || [];

			if (markets.length === 0) {
				return '📅 No macro economic data available.';
			}

			// Format output
			let output = `# 📅 Upcoming Macro Economic Data\n\n`;

			// Calculate totals
			const totalEvents = markets.reduce(
				(sum, market) => sum + (market.items?.length || 0),
				0
			);
			output += `**Total Markets**: ${markets.length}\n`;
			output += `**Total Events**: ${totalEvents}\n`;

			if (macroData.url) {
				output += `**Finance Calendar**: [View Full Calendar](${macroData.url})\n`;
			}

			output += `\n---\n\n`;

			// Market region labels
			const marketLabels: Record<string, string> = {
				US: '🇺🇸 United States',
				EU: '🇪🇺 European Union',
				HK: '🇭🇰 Hong Kong',
				CN: '🇨🇳 China',
				JP: '🇯🇵 Japan',
				UK: '🇬🇧 United Kingdom',
				SG: '🇸🇬 Singapore',
				AU: '🇦🇺 Australia'
			};

			// Process each market
			for (const market of markets) {
				const marketCode = market.market;
				const marketLabel =
					marketLabels[marketCode] ||
					`🌍 ${marketCode}`;
				const events = market.items || [];

				output += `## ${marketLabel}\n\n`;
				output += `**Total Events**: ${events.length}\n\n`;

				// Group events by date
				const eventsByDate: Record<
					string,
					typeof events
				> = {};

				for (const event of events) {
					const dateKey = event.date;
					if (!eventsByDate[dateKey]) {
						eventsByDate[dateKey] = [];
					}
					eventsByDate[dateKey].push(event);
				}

				// Sort dates
				const sortedDates = Object.keys(eventsByDate).sort();

				// Process each date
				for (const dateKey of sortedDates) {
					const dateEvents = eventsByDate[dateKey];

					// Format date
					const year = dateKey.substring(0, 4);
					const month = dateKey.substring(4, 6);
					const day = dateKey.substring(6, 8);
					const formattedDate = `${year}-${month}-${day}`;

					// Convert to readable format
					const date = new Date(
						parseInt(year),
						parseInt(month) - 1,
						parseInt(day)
					);
					const dateStr = date.toLocaleDateString('en-US', {
						weekday: 'short',
						year: 'numeric',
						month: 'short',
						day: 'numeric'
					});

					output += `### 📆 ${dateStr}\n\n`;

					// Process each event
					for (const event of dateEvents) {
						// Importance stars
						const starCount = event.star || 0;
						const stars = '⭐'.repeat(starCount);
						const importance =
							starCount >= 3
								? '🔥 High'
								: starCount >= 2
								? '⚠️ Medium'
								: 'ℹ️ Low';

						output += `#### ${event.act_desc}`;
						if (stars) {
							output += ` ${stars}`;
						}
						output += `\n\n`;

						output += `- **Importance**: ${importance}\n`;

						// Timestamp
						if (event.timestamp) {
							const timestamp = parseInt(event.timestamp);
							const eventDate = new Date(
								timestamp * 1000
							);
							output += `- **Time**: ${eventDate.toLocaleString('en-US', {
								month: 'short',
								day: 'numeric',
								hour: '2-digit',
								minute: '2-digit',
								timeZoneName: 'short'
							})}\n`;
						}

						// Data values
						if (event.data_kv && event.data_kv.length > 0) {
							output += `- **Data**:\n`;
							for (const kv of event.data_kv) {
								const value =
									kv.value === '--' ||
									kv.value === ''
										? 'N/A'
										: kv.value;
								output += `  - ${kv.key}: ${value}`;

								// Add indicators for actual vs estimate
								if (
									kv.type === 'actual' &&
									value !== 'N/A'
								) {
									const actualVal = parseFloat(
										value
									);
									const estimateKv =
										event.data_kv.find(
											(k) =>
												k.type === 'estimate'
										);
									if (
										estimateKv &&
										estimateKv.value !== '--' &&
										estimateKv.value !== ''
									) {
										const estimateVal =
											parseFloat(
												estimateKv.value
											);
										if (!isNaN(actualVal) && !isNaN(estimateVal)) {
											if (
												actualVal > estimateVal
											) {
												output += ' 📈 (Beat)';
											} else if (
												actualVal < estimateVal
											) {
												output += ' 📉 (Miss)';
											} else {
												output += ' 🎯 (Match)';
											}
										}
									}
								}

								output += `\n`;
							}
						}

						// Chart link
						if (event.chart_uid) {
							output += `- **Chart**: [View Chart](https://longbridge.app.wbrks.com/portfolio/finance-calendar/detail?chart_uid=${event.chart_uid})\n`;
						}

						output += `\n`;
					}
				}

				output += `---\n\n`;
			}

			// Add summary statistics
			output += `## 📊 Summary\n\n`;

			// Count by importance
			let highImportance = 0;
			let mediumImportance = 0;
			let lowImportance = 0;

			for (const market of markets) {
				for (const event of market.items || []) {
					const star = event.star || 0;
					if (star >= 3) highImportance++;
					else if (star >= 2) mediumImportance++;
					else lowImportance++;
				}
			}

			output += `### 🎯 By Importance\n\n`;
			output += `- 🔥 **High (3+ stars)**: ${highImportance} events\n`;
			output += `- ⚠️ **Medium (2 stars)**: ${mediumImportance} events\n`;
			output += `- ℹ️ **Low (0-1 stars)**: ${lowImportance} events\n\n`;

			// Count by market
			output += `### 🌍 By Market\n\n`;
			for (const market of markets) {
				const marketCode = market.market;
				const marketLabel =
					marketLabels[marketCode] || marketCode;
				const count = market.items?.length || 0;
				output += `- ${marketLabel}: ${count} events\n`;
			}

			// Upcoming highlights (high importance events)
			output += `\n### 🔥 High Impact Events\n\n`;

			const highImpactEvents = [];
			for (const market of markets) {
				for (const event of market.items || []) {
					if ((event.star || 0) >= 3) {
						highImpactEvents.push({
							market: market.market,
							event
						});
					}
				}
			}

			// Sort by timestamp
			highImpactEvents.sort(
				(a, b) =>
					parseInt(a.event.timestamp) -
					parseInt(b.event.timestamp)
			);

			if (highImpactEvents.length > 0) {
				for (const item of highImpactEvents.slice(0, 5)) {
					const marketLabel =
						marketLabels[item.market] || item.market;
					output += `- **${item.event.act_desc}** (${marketLabel})`;

					// Date
					const timestamp = parseInt(item.event.timestamp);
					const date = new Date(timestamp * 1000);
					output += ` - ${date.toLocaleDateString('en-US', {
						month: 'short',
						day: 'numeric'
					})}\n`;
				}
			} else {
				output += `No high impact events scheduled.\n`;
			}

			return output;
		} catch (error) {
			if (error instanceof Error) {
				throw error;
			}
			throw new Error(
				'Failed to fetch macro data for market: Unknown error'
			);
		}
	}
});

// Tool 23: Get market activities (earnings reports, etc.)
export const getMarketActivitiesTool = createMastraTool({
  category: 'stock-global',
	id: 'get_market_activities_lbk',
	description:
		'Fetch upcoming market activities including earnings reports, financial announcements, and corporate events across all markets. Returns detailed information about scheduled earnings releases, estimates, and actual results.',
	outputSchema: z.object({
		count: z.number(),
		activities: z.array(z.any()).describe('Upcoming events')
	}).describe('Market activities and events data'),
	inputSchema: z.object({
		kind: z.string().describe('Type of activities to fetch. Options: "all" (all activities), "earnings" (earnings only), "dividends" (dividend events), etc. Default is "all".'),
		limit: z.number().describe('Maximum number of activities to return. Default is 10. Maximum is 50.')
	}).describe('Market code and target type parameters'),
	execute: async ({ context }) => {
		try {
			// Validate and set defaults
			const kind = context.kind || 'all';
			const limit = Math.min(Math.max(context.limit || 10, 1), 50);

			// Make API request
			const response = await requestUrl({
				url: `https://m.lbkrs.com/api/forward/stock/activity/for_market?kind=${kind}&limit=${limit}`,
				method: 'GET',
				headers: {
					Accept: 'application/json, text/plain, */*',
					'x-app-id': 'longport',
					'x-platform': 'web'
				}
			});

			if (response.status !== 200) {
				throw new Error(
					`API request failed with status ${response.status}`
				);
			}

			const data = response.json;

			if (data.code !== 0) {
				throw new Error(
					`API error: ${data.message || 'Unknown error'}`
				);
			}

			const activities = data.data.items || [];

			if (activities.length === 0) {
				return '📋 No upcoming market activities found.';
			}

			// Format output
			let output = `# 📋 Upcoming Market Activities\n\n`;
			output += `**Total Activities**: ${activities.length}\n`;
			output += `**Activity Type**: ${kind === 'all' ? 'All Types' : kind.charAt(0).toUpperCase() + kind.slice(1)}\n\n`;
			output += `---\n\n`;

			// Group activities by date
			const activitiesByDate: { [date: string]: typeof activities } =
				{};

			for (const activity of activities) {
				const dateStr = activity.date_str || activity.date;
				if (!activitiesByDate[dateStr]) {
					activitiesByDate[dateStr] = [];
				}
				activitiesByDate[dateStr].push(activity);
			}

			// Process each date group
			for (const [dateStr, dateActivities] of Object.entries(
				activitiesByDate
			)) {
				output += `## 📅 ${dateStr}\n\n`;
				output += `**Events**: ${dateActivities.length}\n\n`;

				// Process each activity
				for (const activity of dateActivities) {
					const security = activity.security;
					const quote = activity.quote;

					// Activity header with stock info
					output += `### ${security.name} (${security.market}:${quote.code})`;

					// Current price and change
					if (quote.last_done) {
						const price = parseFloat(quote.last_done);
						const change = parseFloat(quote.change);
						const changePercent = price > 0 ? (change / (price - change)) * 100 : 0;
						const indicator = change >= 0 ? '📈' : '📉';
						const changeSign = change >= 0 ? '+' : '';

						output += ` - $${price.toFixed(2)} ${indicator} ${changeSign}${changePercent.toFixed(2)}%`;
					}

					output += `\n\n`;

					// Activity details
					output += `- **Type**: ${activity.act_type || activity.act_title}\n`;
					output += `- **Description**: ${activity.act_desc}\n`;

					if (activity.date_type) {
						output += `- **Date Type**: ${activity.date_type}\n`;
					}

					// Trading status
					const tradeStatus =
						quote.trade_status === 108
							? '🟢 Trading'
							: '🔴 Closed';
					output += `- **Trading Status**: ${tradeStatus}\n`;

					// Financial estimates and actuals
					if (activity.data_kv && activity.data_kv.length > 0) {
						const hasData = activity.data_kv.some(
							(kv: any) => kv.value !== '--' && kv.value !== ''
						);

						if (hasData) {
							output += `- **Financial Data**:\n`;

							// Find EPS and Revenue data
							const estimateEPS = activity.data_kv.find(
								(kv: any) => kv.type === 'estimate_eps'
							);
							const estimateRevenue = activity.data_kv.find(
								(kv: any) => kv.type === 'estimate_revenue'
							);
							const actualEPS = activity.data_kv.find(
								(kv: any) => kv.type === 'actual_eps'
							);
							const actualRevenue = activity.data_kv.find(
								(kv: any) => kv.type === 'actual_revenue'
							);

							if (estimateEPS && estimateEPS.value !== '--') {
								output += `  - 📊 Estimated EPS: ${estimateEPS.value}\n`;
							}
							if (estimateRevenue && estimateRevenue.value !== '--') {
								output += `  - 📊 Estimated Revenue: ${estimateRevenue.value}\n`;
							}
							if (actualEPS) {
								const epsValue =
									actualEPS.value === '待公布' ||
									actualEPS.value === '--'
										? 'Pending'
										: actualEPS.value;
								const epsIndicator =
									epsValue === 'Pending' ? '⏳' : '✅';
								output += `  - ${epsIndicator} Actual EPS: ${epsValue}\n`;
							}
							if (actualRevenue) {
								const revValue =
									actualRevenue.value === '待公布' ||
									actualRevenue.value === '--'
										? 'Pending'
										: actualRevenue.value;
								const revIndicator =
									revValue === 'Pending' ? '⏳' : '✅';
								output += `  - ${revIndicator} Actual Revenue: ${revValue}\n`;
							}
						}
					}

					// Stock icon
					if (activity.icon) {
						output += `- **Icon**: [View Logo](${activity.icon})\n`;
					}

					output += `\n`;
				}

				output += `---\n\n`;
			}

			// Summary statistics
			output += `## 📊 Summary\n\n`;

			// Count by market
			const marketCounts: { [market: string]: number } = {};
			for (const activity of activities) {
				const market = activity.security.market;
				marketCounts[market] = (marketCounts[market] || 0) + 1;
			}

			output += `### 🌍 By Market\n\n`;
			const marketLabels: { [key: string]: string } = {
				US: '🇺🇸 US',
				HK: '🇭🇰 HK',
				CN: '🇨🇳 CN',
				SG: '🇸🇬 SG',
				UK: '🇬🇧 UK'
			};

			for (const [market, count] of Object.entries(marketCounts)) {
				const label = marketLabels[market] || market;
				output += `- ${label}: ${count} activities\n`;
			}

			// Count by activity type
			const typeCounts: { [type: string]: number } = {};
			for (const activity of activities) {
				const type = activity.act_type || activity.act_title;
				typeCounts[type] = (typeCounts[type] || 0) + 1;
			}

			output += `\n### 📋 By Activity Type\n\n`;
			for (const [type, count] of Object.entries(typeCounts)) {
				output += `- ${type}: ${count} events\n`;
			}

			// Count pending vs released
			let pendingCount = 0;
			let releasedCount = 0;

			for (const activity of activities) {
				if (activity.data_kv && activity.data_kv.length > 0) {
					const hasPending = activity.data_kv.some(
						(kv: any) =>
							kv.value === '待公布' || kv.value === 'Pending'
					);
					const hasActual = activity.data_kv.some(
						(kv: any) =>
							kv.type.includes('actual') &&
							kv.value !== '待公布' &&
							kv.value !== '--' &&
							kv.value !== ''
					);

					if (hasActual) {
						releasedCount++;
					} else if (hasPending) {
						pendingCount++;
					}
				}
			}

			if (pendingCount > 0 || releasedCount > 0) {
				output += `\n### ⏱️ By Status\n\n`;
				if (pendingCount > 0) {
					output += `- ⏳ Pending Release: ${pendingCount} activities\n`;
				}
				if (releasedCount > 0) {
					output += `- ✅ Results Released: ${releasedCount} activities\n`;
				}
			}

			return output;
		} catch (error) {
			if (error instanceof Error) {
				throw error;
			}
			throw new Error(
				'Failed to fetch market activities: Unknown error'
			);
		}
	}
});

// Tool 24: Get market alert events
export const getMarketAlertEventsTool = createMastraTool({
  category: 'stock-global',
	id: 'get_market_alert_events_lbk',
	description:
		'Fetch real-time market alert events for stocks experiencing significant movements. Returns stocks with volatility alerts, price alerts, news alerts, and target alerts. Includes alert reasons, related news posts, and engagement metrics. Supports filtering by market and sorting options.',
	outputSchema: z.object({
		count: z.number(),
		alerts: z.array(z.any()).describe('Stock alerts')
	}).describe('Market alert events'),
	inputSchema: z.object({
		market: z.string().describe('Market code to filter events. Options: "" (all markets), "US", "HK", "CN", etc. Default is "" for all markets.'),
		limit: z.number().describe('Maximum number of events to return. Default is 20. Maximum is 50.'),
		sort: z.number().describe('Sort order for events. 0 = latest first (default), 1 = other sort options.')
	}).describe('Tool input parameters'),
	execute: async ({ context }) => {
		try {
			// Validate and set defaults
			const market = context.market || '';
			const limit = Math.min(Math.max(context.limit || 20, 1), 50);
			const sort = context.sort || 0;

			// Make API request
			const requestBody = {
				next_params: {},
				market: market,
				limit: limit,
				sort: sort
			};

			const response = await requestUrl({
				url: 'https://m.lbkrs.com/api/forward/newmarket/stock_events',
				method: 'POST',
				headers: {
					Accept: 'application/json, text/plain, */*',
					'Content-Type': 'application/json',
					'x-app-id': 'longport',
					'x-platform': 'web'
				},
				body: JSON.stringify(requestBody)
			});

			if (response.status !== 200) {
				throw new Error(
					`API request failed with status ${response.status}`
				);
			}

			const data = response.json;

			if (data.code !== 0) {
				throw new Error(
					`API error: ${data.message || 'Unknown error'}`
				);
			}

			const events = data.data.events || [];

			if (events.length === 0) {
				return '🔔 No stock events found.';
			}

			// Format output
			let output = `# 🔔 Stock Events & Alerts\n\n`;
			output += `**Total Events**: ${events.length}\n`;
			output += `**Market Filter**: ${market || 'All Markets'}\n`;

			if (data.data.updated_at) {
				const updateTime = new Date(
					parseInt(data.data.updated_at) * 1000
				);
				output += `**Last Updated**: ${updateTime.toLocaleString()}\n`;
			}

			output += `\n---\n\n`;

			// Alert type labels
			const alertTypeLabels: { [key: number]: string } = {
				11: '📊 Volatility Alert',
				12: '💰 Price Alert',
				13: '📰 News Alert',
				14: '🎯 Target Alert'
			};

			// Process each event
			for (const event of events) {
				const stock = event.stock;
				const alertType =
					alertTypeLabels[event.alert_type] ||
					`⚠️ Alert ${event.alert_type}`;

				// Stock header
				output += `## ${stock.name} (${stock.market}:${stock.code})\n\n`;

				// Alert information
				output += `### ${alertType}\n\n`;
				output += `**Alert Reason**: ${event.alert_reason}\n\n`;

				// Current price and change
				if (stock.last_done) {
					const price = parseFloat(stock.last_done);
					const change = parseFloat(stock.change);
					const changePercent =
						price > 0 ? (change / (price - change)) * 100 : 0;
					const indicator = change >= 0 ? '📈' : '📉';
					const changeSign = change >= 0 ? '+' : '';

					output += `**Current Price**: $${price.toFixed(2)} ${indicator} ${changeSign}${changePercent.toFixed(2)}%\n`;
				}

				// Trading status
				const tradeStatus =
					stock.trade_status === 202
						? '🔴 After Hours'
						: stock.trade_status === 108
						? '🟢 Trading'
						: `Status ${stock.trade_status}`;
				output += `**Trading Status**: ${tradeStatus}\n`;

				// Overnight price if available
				if (stock.overnight_price && stock.overnight_price.last_done) {
					const overnightChange = parseFloat(
						stock.overnight_price.change
					);
					const overnightIndicator =
						overnightChange >= 0 ? '📈' : '📉';
					const overnightSign = overnightChange >= 0 ? '+' : '';
					output += `**Overnight Change**: ${overnightIndicator} ${overnightSign}${(overnightChange * 100).toFixed(2)}%\n`;
				}

				// Company information
				if (stock.intro) {
					output += `**Introduction**: ${stock.intro}\n`;
				}

				// Labels/Tags
				if (stock.labels && stock.labels.length > 0) {
					output += `**Industry**: ${stock.labels.join(', ')}\n`;
				}

				// Event timestamp
				if (event.timestamp && event.timestamp !== '0') {
					const eventTime = new Date(
						parseInt(event.timestamp) * 1000
					);
					output += `**Event Time**: ${eventTime.toLocaleString()}\n`;
				}

				// Related news post
				if (event.post) {
					output += `\n#### 📰 Related News\n\n`;
					output += `**Title**: ${event.post.title}\n`;

					// Extract description text (remove HTML)
					const descText = event.post.description_html
						.replace(/<[^>]*>/g, '')
						.trim();
					if (descText) {
						output += `**Summary**: ${descText}\n`;
					}

					if (event.post.published_at) {
						const postTime = new Date(
							parseInt(event.post.published_at) * 1000
						);
						output += `**Published**: ${postTime.toLocaleString()}\n`;
					}

					// Post engagement
					output += `**Engagement**: 👍 ${event.post.likes_count} | 💬 ${event.post.comments_count} | 🔄 ${event.post.shares_count}\n`;

					if (event.post.detail_url) {
						output += `**Read More**: [View Full Article](${event.post.detail_url})\n`;
					}

					if (event.post.post_source) {
						output += `**Source**: ${event.post.post_source.name}\n`;
					}
				}

				// Stock logo
				if (stock.logo) {
					output += `\n**Logo**: [View Logo](${stock.logo})\n`;
				}

				output += `\n---\n\n`;
			}

			// Summary statistics
			output += `## 📊 Summary\n\n`;

			// Count by market
			const marketCounts: { [market: string]: number } = {};
			for (const event of events) {
				const mkt = event.stock.market;
				marketCounts[mkt] = (marketCounts[mkt] || 0) + 1;
			}

			output += `### 🌍 By Market\n\n`;
			const marketLabels: { [key: string]: string } = {
				US: '🇺🇸 US',
				HK: '🇭🇰 HK',
				CN: '🇨🇳 CN',
				SG: '🇸🇬 SG',
				UK: '🇬🇧 UK'
			};

			for (const [mkt, count] of Object.entries(marketCounts)) {
				const label = marketLabels[mkt] || mkt;
				output += `- ${label}: ${count} events\n`;
			}

			// Count by alert type
			const alertTypeCounts: { [type: number]: number } = {};
			for (const event of events) {
				const type = event.alert_type;
				alertTypeCounts[type] = (alertTypeCounts[type] || 0) + 1;
			}

			output += `\n### 🔔 By Alert Type\n\n`;
			for (const [type, count] of Object.entries(alertTypeCounts)) {
				const typeNum = parseInt(type);
				const label =
					alertTypeLabels[typeNum] || `Alert ${type}`;
				output += `- ${label}: ${count} events\n`;
			}

			// Count events with news
			const eventsWithNews = events.filter(
				(e: any) => e.post !== null
			).length;
			const eventsWithoutNews = events.length - eventsWithNews;

			output += `\n### 📰 News Coverage\n\n`;
			output += `- With News: ${eventsWithNews} events\n`;
			output += `- Without News: ${eventsWithoutNews} events\n`;

			// Count by industry/label
			const industryCount: { [industry: string]: number } = {};
			for (const event of events) {
				if (event.stock.labels && event.stock.labels.length > 0) {
					for (const label of event.stock.labels) {
						industryCount[label] =
							(industryCount[label] || 0) + 1;
					}
				}
			}

			if (Object.keys(industryCount).length > 0) {
				output += `\n### 🏭 By Industry (Top 5)\n\n`;
				const topIndustries = Object.entries(industryCount)
					.sort((a, b) => b[1] - a[1])
					.slice(0, 5);

				for (const [industry, count] of topIndustries) {
					output += `- ${industry}: ${count} events\n`;
				}
			}

			return output;
		} catch (error) {
			if (error instanceof Error) {
				throw error;
			}
			throw new Error('Failed to fetch stock events: Unknown error');
		}
	}
});