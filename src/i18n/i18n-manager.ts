/**
 * Internationalization Manager for LLMSider Plugin
 * Supports automatic language detection based on Obsidian's locale settings
 * 
 * File structure:
 * - types/ - Type definitions split into modular files
 * - locales/<lang>/ - Translation modules by language
 */

// Import all type definitions from the centralized types index
import type { TranslationKeys } from './types';
import { Logger } from './../utils/logger';

export type SupportedLanguage = 'en' | 'zh';

// Re-export TranslationKeys for backward compatibility
export type { TranslationKeys };

export class I18nManager {
private currentLanguage: SupportedLanguage = 'en';
private translations: Record<SupportedLanguage, unknown> = {} as unknown;
private fallbackLanguage: SupportedLanguage = 'en';
private languageChangeListeners: Array<(language: SupportedLanguage) => void> = [];

	/**
	 * Initialize the i18n manager with language detection
	 */
	async initialize(obsidianLocale?: string): Promise<void> {
		// Detect language from Obsidian's locale setting
		this.currentLanguage = this.detectLanguage(obsidianLocale);

		// Load all translation files
		await this.loadTranslations();

		Logger.debug(`Initialized with language: ${this.currentLanguage}`);
	}

	/**
	 * Detect user's preferred language based on Obsidian's locale
	 */
	private detectLanguage(obsidianLocale?: string): SupportedLanguage {
		if (!obsidianLocale) {
			// Fallback to browser/system locale
			obsidianLocale = navigator.language || 'en';
		}

		const locale = obsidianLocale.toLowerCase();

		// Check for Chinese variants
		if (locale.startsWith('zh') || locale.includes('chinese')) {
			return 'zh';
		}

		// Default to English for all other cases
		return 'en';
	}

	/**
	 * Load translation files
	 */
	private async loadTranslations(): Promise<void> {
		try {
			const { en } = await import('./locales/en');
			const { zh } = await import('./locales/zh');

			this.translations.en = en;
			this.translations.zh = zh;
		} catch (error) {
			Logger.error('Failed to load translations:', error);
			// Use fallback translations if loading fails
			this.translations.en = this.createFallbackTranslations();
			this.translations.zh = this.createFallbackTranslations();
		}
	}

	/**
	 * Create fallback translations to prevent crashes
	 */
	private createFallbackTranslations() {
		// Return a minimal fallback object with essential properties
		return {
			pluginName: 'LLMSider',
			pluginDescription: 'AI Assistant for Obsidian',
			chatPlaceholder: 'Type your message...',
			sendMessage: 'Send',
			abortGeneration: 'Abort',
			clearChat: 'Clear',
			messageActions: {
				toggleDiffRendering: 'Toggle Diff Rendering',
				applyChanges: 'Apply Changes',
				copyAsMarkdown: 'Copy as Markdown',
				generateNewNote: 'Generate new Note',
				copyMessage: 'Copy message',
				editAndResend: 'Edit and resend'
			},
			settings: 'Settings',
			providers: 'Providers',
			addProvider: 'Add Provider',
			editProvider: 'Edit Provider',
			deleteProvider: 'Delete Provider',
			providerName: 'Provider Name',
			providerType: 'Provider Type',
			apiKey: 'API Key',
			baseUrl: 'Base URL',
			model: 'Model',
			temperature: 'Temperature',
			maxTokens: 'Max Tokens',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete'
  } as unknown;
}

	/**
	 * Get translated text by key path
	 */
	t(keyPath: string, params?: Record<string, string | number>): string {
		const keys = keyPath.split('.');
		let value: unknown = this.translations[this.currentLanguage];

		// Navigate through nested keys
		for (const key of keys) {
			if (value && typeof value === 'object' && key in value) {
				value = value[key];
			} else {
				// Try fallback language
				value = this.translations[this.fallbackLanguage];
				for (const fallbackKey of keys) {
					if (value && typeof value === 'object' && fallbackKey in value) {
						value = value[fallbackKey];
					} else {
						Logger.warn(`Translation missing for key: ${keyPath}`);
						return keyPath; // Return key path as fallback
					}
				}
				break;
			}
		}

		if (typeof value !== 'string') {
			Logger.warn(`Invalid translation value for key: ${keyPath}`);
			return keyPath;
		}

		// Replace parameters in the translation
		if (params) {
			return this.replaceParams(value, params);
		}

		return value;
	}

	/**
	 * Replace parameters in translation string
	 */
	private replaceParams(text: string, params: Record<string, string | number>): string {
		return text.replace(/\{(\w+)\}/g, (match, key) => {
			return params[key]?.toString() || match;
		});
	}

	/**
	 * Get current language
	 */
	getCurrentLanguage(): SupportedLanguage {
		return this.currentLanguage;
	}

	/**
	 * Set current language
	 */
	setLanguage(language: SupportedLanguage): void {
		if (language in this.translations) {
			this.currentLanguage = language;
			Logger.debug(`Language changed to: ${language}`);
			// Notify all listeners about the language change
			this.languageChangeListeners.forEach(listener => {
				try {
					listener(language);
				} catch (error) {
					Logger.error('Error in language change listener:', error);
				}
			});
		} else {
			Logger.warn(`Unsupported language: ${language}`);
		}
	}

	/**
	 * Add a listener for language changes
	 */
	onLanguageChange(listener: (language: SupportedLanguage) => void): void {
		this.languageChangeListeners.push(listener);
	}

	/**
	 * Remove a language change listener
	 */
	offLanguageChange(listener: (language: SupportedLanguage) => void): void {
		const index = this.languageChangeListeners.indexOf(listener);
		if (index > -1) {
			this.languageChangeListeners.splice(index, 1);
		}
	}

	/**
	 * Get all supported languages
	 */
	getSupportedLanguages(): SupportedLanguage[] {
		return ['en', 'zh'];
	}

	/**
	 * Check if a language is supported
	 */
	isLanguageSupported(language: string): language is SupportedLanguage {
		return ['en', 'zh'].includes(language as SupportedLanguage);
	}
}

// Export singleton instance
export const i18n = new I18nManager();
