/**
 * Complete TranslationKeys type - inferred from actual Chinese translations
 * Using typeof ensures types match actual implementation
 */

import type { zh } from '../locales/zh/index';

/**
 * Main translation keys type derived from actual Chinese translations
 * This approach ensures type safety while avoiding manual type definitions
 */
export type TranslationKeys = typeof zh;
