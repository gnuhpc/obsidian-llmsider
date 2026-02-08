import { I18nManager } from '../../i18n/i18n-manager';
import { CATEGORY_I18N_MAP } from '../../types/tool-categories';

// Category mapping to i18n keys - shared across settings and UI
// Now sourced from central definition to ensure consistency
export const categoryMap = CATEGORY_I18N_MAP;

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
