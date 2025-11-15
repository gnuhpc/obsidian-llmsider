import { I18nManager } from '../../i18n/i18n-manager';

// Category mapping to i18n keys - shared across settings and UI
export const categoryMap: Record<string, string> = {
	// Core
	'file-management': 'fileManagement',
	'file-system': 'fileSystem',
	'editor': 'editor',
	'note-management': 'noteManagement',
	'search': 'search',
	'utility': 'utility',
	// Web
	'web-content': 'webContent',
	'search-engines': 'searchEngines',
	// Markets
	'stock': 'stock',
	'financial': 'financial',
	'futures': 'futures',
	'bonds': 'bonds',
	'options': 'options',
	'funds': 'funds',
	'forex': 'forex',
	'crypto': 'crypto',
	// Advanced Markets
	'derivatives': 'derivatives',
	'microstructure': 'microstructure',
	'credit': 'credit',
	'alternative': 'alternative',
	'international': 'international',
	'commodity': 'commodity',
	'technical': 'technical',
	// Data
	'macro': 'macro',
	'industry': 'industry',
	'news': 'news',
	'sentiment': 'sentiment',
	'esg': 'esg',
	'risk': 'risk',
	// Others
	'weather': 'weather',
	'entertainment': 'entertainment',
	'other': 'other'
};

// Get category display name with i18n - shared across settings and UI
export function getCategoryDisplayName(category: string, i18n: I18nManager): string {
	const i18nKey = categoryMap[category] || 'other';
	const i18nPath = `settingsPage.categories.${i18nKey}`;
	const translated = i18n.t(i18nPath);
	
	// Check if translation was found (i18n.t returns the keyPath if not found)
	if (translated && !translated.startsWith('settingsPage.categories.')) {
		return translated;
	}
	
	// Fallback: convert category to readable format
	return category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' ');
}
