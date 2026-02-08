/**
 * Central definition of tool categories
 * This is the single source of truth for all tool categorization
 */

/**
 * Tool category union type
 * All valid category values that can be assigned to tools
 */
export type ToolCategory =
	| 'note-management'
	| 'search-web'
	| 'system-command'
	| 'stock-china'
	| 'stock-global'
	| 'funds'
	| 'futures'
	| 'options'
	| 'bonds'
	| 'derivatives'
	| 'macro-economy'
	| 'credit-risk'
	| 'esg-industry'
	| 'commodity-forex'
	| 'news-info'
	| 'entertainment'
	| 'meta'
	| 'other';

/**
 * Category metadata interface
 */
export interface CategoryMetadata {
	key: ToolCategory;
	i18nKey: string;
	description?: string;
}

/**
 * All tool categories with metadata
 * This array is the authoritative list of all categories
 */
export const TOOL_CATEGORIES: readonly CategoryMetadata[] = [
	{
		key: 'note-management',
		i18nKey: 'note-management',
		description: 'Note and document management tools'
	},
	{
		key: 'search-web',
		i18nKey: 'search-web',
		description: 'Search and web content tools'
	},
	{
		key: 'system-command',
		i18nKey: 'system-command',
		description: 'System command execution and process management'
	},
	{
		key: 'stock-china',
		i18nKey: 'stock-china',
		description: 'China A-share market data and analysis'
	},
	{
		key: 'stock-global',
		i18nKey: 'stock-global',
		description: 'Global stock markets (US, HK, etc.)'
	},
	{
		key: 'funds',
		i18nKey: 'funds',
		description: 'Fund market data and analysis'
	},
	{
		key: 'futures',
		i18nKey: 'futures',
		description: 'Futures market data and analysis'
	},
	{
		key: 'options',
		i18nKey: 'options',
		description: 'Options market data and analysis'
	},
	{
		key: 'bonds',
		i18nKey: 'bonds',
		description: 'Bond market data and analysis'
	},
	{
		key: 'derivatives',
		i18nKey: 'derivatives',
		description: 'Derivatives and structured products'
	},
	{
		key: 'macro-economy',
		i18nKey: 'macro-economy',
		description: 'Macroeconomic data and indicators'
	},
	{
		key: 'credit-risk',
		i18nKey: 'credit-risk',
		description: 'Credit analysis and risk management'
	},
	{
		key: 'esg-industry',
		i18nKey: 'esg-industry',
		description: 'ESG data and industry analysis'
	},
	{
		key: 'commodity-forex',
		i18nKey: 'commodity-forex',
		description: 'Commodity and foreign exchange markets'
	},
	{
		key: 'news-info',
		i18nKey: 'news-info',
		description: 'News and information services'
	},
	{
		key: 'entertainment',
		i18nKey: 'entertainment',
		description: 'Entertainment and media tools'
	},
	{
		key: 'other',
		i18nKey: 'other',
		description: 'Other tools'
	}
] as const;

/**
 * Category map for quick lookup
 * Maps category keys to i18n keys
 */
export const CATEGORY_I18N_MAP: Record<ToolCategory, string> = TOOL_CATEGORIES.reduce(
	(acc, cat) => {
		acc[cat.key] = cat.i18nKey;
		return acc;
	},
	{} as Record<ToolCategory, string>
);

/**
 * Get all category keys
 */
export function getAllCategoryKeys(): readonly ToolCategory[] {
	return TOOL_CATEGORIES.map(cat => cat.key);
}

/**
 * Check if a string is a valid category
 */
export function isValidCategory(category: string): category is ToolCategory {
	return TOOL_CATEGORIES.some(cat => cat.key === category);
}

/**
 * Get category metadata by key
 */
export function getCategoryMetadata(category: ToolCategory): CategoryMetadata | undefined {
	return TOOL_CATEGORIES.find(cat => cat.key === category);
}
