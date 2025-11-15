// Bond market data tools
// Provides bonds, convertible bonds, treasury yields and bond market data

import { requestUrl } from 'obsidian';
import { BuiltInTool } from './built-in-tools';


/**
 * 获取企业债信息
 * Get corporate bond information
 */
export const getCorporateBondTool: BuiltInTool = {
	name: 'get_corporate_bond',
	description: 'Get corporate bond quotes and information',
  category: 'bonds',
	inputSchema: {
		type: 'object',
		properties: {
			rating: {
				type: 'string',
				description: 'Bond rating filter: AAA, AA+, AA, AA-, etc. (leave empty for all)',
				default: ''
			}
		},
		required: []
	},
	execute: async (args: { rating?: string }): Promise<string> => {
		try {
			// 使用东方财富企业债接口
			const url = 'http://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=100&po=1&np=1&fltt=2&invt=2&fid=f3&fs=b:MK0354&fields=f12,f14,f2,f3,f15,f16,f17,f18';
			
			const response = await requestUrl({
				url,
				method: 'GET',
				headers: {
					'Referer': 'http://quote.eastmoney.com/',
					'User-Agent': 'Mozilla/5.0'
				}
			});

			const data = JSON.parse(response.text);
			if (!data?.data?.diff) {
				return JSON.stringify({ error: '获取企业债数据失败' }, null, 2);
			}

			let bonds = data.data.diff.map((item: any) => ({
				code: item.f12,
				name: item.f14,
				current: item.f2,
				change_pct: item.f3 + '%',
				high: item.f15,
				low: item.f16,
				open: item.f17,
				prev_close: item.f18
			}));

			// 根据评级筛选
			if (args.rating) {
				bonds = bonds.filter((bond: any) => 
					bond.name.includes(args.rating)
				);
			}

			return JSON.stringify({
				total: bonds.length,
				rating_filter: args.rating || 'ALL',
				update_time: new Date().toLocaleString('zh-CN'),
				data: bonds.slice(0, 50),
				note: bonds.length > 50 ? `显示前50条，共${bonds.length}条` : '全部数据'
			}, null, 2);
		} catch (error: any) {
			return JSON.stringify({ error: `获取企业债数据失败: ${error?.message || String(error)}` }, null, 2);
		}
	}
};


