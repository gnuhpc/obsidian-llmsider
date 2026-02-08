import { Logger } from './../utils/logger';
/**
 * Configuration for built-in tools default state
 */

/**
 * Categories that should be enabled by default on first launch
 * Only note-management and search-web categories are enabled by default
 * All other categories are disabled by default
 */
export const DEFAULT_ENABLED_CATEGORIES = [
	'note-management',   // 笔记管理（统一分类）
	'search-web',        // 搜索与网络
] as const;

/**
 * Check if a category should be enabled by default
 */
export function isCategoryEnabledByDefault(category: string): boolean {
	return DEFAULT_ENABLED_CATEGORIES.includes(category as unknown);
}

/**
 * Get default permissions for all built-in tools
 * @param allTools - All available built-in tools
 * @returns Record of tool permissions (tool name -> enabled)
 */
export function getDefaultBuiltInToolsPermissions(allTools: unknown[]): Record<string, boolean> {
	const permissions: Record<string, boolean> = {};
	
	Logger.debug('Generating default permissions for', allTools.length, 'tools');
	
	// Count by category
	const categoryCounts: Record<string, { total: number; enabled: number }> = {};
	
	allTools.forEach((tool: unknown) => {
		const category = tool.category || 'other';
		const isEnabled = isCategoryEnabledByDefault(category);
		permissions[tool.name] = isEnabled;
		
		if (!categoryCounts[category]) {
			categoryCounts[category] = { total: 0, enabled: 0 };
		}
		categoryCounts[category].total++;
		if (isEnabled) {
			categoryCounts[category].enabled++;
		}
	});
	
	// Log summary
	Logger.debug('Default permissions summary by category:');
	Object.entries(categoryCounts).forEach(([category, counts]) => {
		const status = counts.enabled === counts.total ? '✓ ALL ENABLED' : 
		               counts.enabled === 0 ? '✗ ALL DISABLED' : 
		               `⚠ PARTIAL (${counts.enabled}/${counts.total})`;
		Logger.debug(`  ${category}: ${status}`);
	});
	
	const totalEnabled = Object.values(permissions).filter(v => v === true).length;
	const totalDisabled = Object.values(permissions).filter(v => v === false).length;
	Logger.debug(`Total: ${totalEnabled} enabled, ${totalDisabled} disabled out of ${allTools.length} tools`);
	
	return permissions;
}
