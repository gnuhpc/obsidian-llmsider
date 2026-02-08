/**
 * Generate i18n category translations from central definition
 * This ensures i18n files stay in sync with the category definition
 */

import { TOOL_CATEGORIES } from '../types/tool-categories';
import { Logger } from '../utils/logger';

/**
 * Generate the categories object for i18n files
 * @param translations - Object mapping category keys to translated names
 * @returns Formatted TypeScript object string
 */
export function generateCategoryI18n(translations: Record<string, string>): string {
	const entries = TOOL_CATEGORIES.map(cat => {
		const translation = translations[cat.key] || cat.key;
		return `\t\t\t'${cat.key}': '${translation}'`;
	}).join(',\n');
	
	return `\t\tcategories: {\n${entries}\n\t\t}`;
}

/**
 * Validate that all categories have translations
 */
export function validateCategoryTranslations(translations: Record<string, string>): { valid: boolean; missing: string[] } {
	const missing: string[] = [];
	
	TOOL_CATEGORIES.forEach(cat => {
		if (!translations[cat.key]) {
			missing.push(cat.key);
		}
	});
	
	return {
		valid: missing.length === 0,
		missing
	};
}

/**
 * English translations
 */
export const EN_CATEGORY_TRANSLATIONS: Record<string, string> = {
	'note-management': 'Note Management',
	'system-command': 'System & Command',
	'stock-china': 'China A-Share Market',
	'stock-global': 'Global Stock Market (US/HK)',
	'funds': 'Funds Market',
	'futures': 'Futures Market',
	'options': 'Options Market',
	'bonds': 'Bond Market',
	'derivatives': 'Derivatives',
	'macro-economy': 'Macroeconomic',
	'credit-risk': 'Credit & Risk',
	'esg-industry': 'ESG & Industry',
	'commodity-forex': 'Commodity & Forex',
	'news-info': 'News & Information',
	'search-web': 'Search & Web',
	'entertainment': 'Entertainment',
	'other': 'Other'
};

/**
 * Chinese translations
 */
export const ZH_CATEGORY_TRANSLATIONS: Record<string, string> = {
	'note-management': '笔记管理',
	'system-command': '系统与命令',
	'stock-china': '中国A股市场',
	'stock-global': '全球股市（美港股）',
	'funds': '基金市场',
	'futures': '期货市场',
	'options': '期权市场',
	'bonds': '债券市场',
	'derivatives': '金融衍生品',
	'macro-economy': '宏观经济',
	'credit-risk': '信用与风险',
	'esg-industry': 'ESG与行业',
	'commodity-forex': '商品与外汇',
	'news-info': '新闻资讯',
	'search-web': '搜索与网络',
	'entertainment': '娱乐内容',
	'other': '其他'
};

// Validate translations on module load (development check)
if (process.env.NODE_ENV !== 'production') {
	const enValidation = validateCategoryTranslations(EN_CATEGORY_TRANSLATIONS);
	const zhValidation = validateCategoryTranslations(ZH_CATEGORY_TRANSLATIONS);
	
	if (!enValidation.valid) {
		Logger.warn('Missing English translations for categories:', enValidation.missing);
	}
	
	if (!zhValidation.valid) {
		Logger.warn('Missing Chinese translations for categories:', zhValidation.missing);
	}
}
