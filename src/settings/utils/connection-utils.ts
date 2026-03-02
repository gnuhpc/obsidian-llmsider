/**
 * Utility functions for connection type handling
 */

/**
 * Get display name for connection type
 */
export function getConnectionTypeName(type: string): string {
	const typeNames: Record<string, string> = {
		'openai': 'OpenAI',
		'anthropic': 'Anthropic',
		'azure-openai': 'Azure OpenAI',
		'gemini': 'Gemini',
		'groq': 'Groq',
		'ollama': 'Ollama',
		'qwen': 'Qwen',
		'free-qwen': 'Free Qwen',
		'free-deepseek': 'Free Deepseek',
		'hugging-chat': 'Hugging Chat',
		'openai-compatible': 'OpenAI-Compatible',
		'siliconflow': 'SiliconFlow',
		'kimi': 'Kimi',
		'github-copilot': 'GitHub Copilot',
		'local': 'Local',
		'opencode': 'OpenCode'
	};
	return typeNames[type] || type.toUpperCase();
}

/**
 * Get SVG logo for connection type
 */
export function getConnectionTypeLogo(type: string): string {
	const logos: Record<string, string> = {
		'openai': `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C10.3431 2 9 3.34315 9 5V7C9 8.65685 10.3431 10 12 10C13.6569 10 15 8.65685 15 7V5C15 3.34315 13.6569 2 12 2Z" stroke="currentColor" stroke-width="1.5"/><path d="M19 9C17.3431 9 16 10.3431 16 12C16 13.6569 17.3431 15 19 15C20.6569 15 22 13.6569 22 12C22 10.3431 20.6569 9 19 9Z" stroke="currentColor" stroke-width="1.5"/><path d="M5 9C3.34315 9 2 10.3431 2 12C2 13.6569 3.34315 15 5 15C6.65685 15 8 13.6569 8 12C8 10.3431 6.65685 9 5 9Z" stroke="currentColor" stroke-width="1.5"/><path d="M12 14C10.3431 14 9 15.3431 9 17V19C9 20.6569 10.3431 22 12 22C13.6569 22 15 20.6569 15 19V17C15 15.3431 13.6569 14 12 14Z" stroke="currentColor" stroke-width="1.5"/><path d="M12 10L19 12M12 10L5 12M12 14L19 12M12 14L5 12" stroke="currentColor" stroke-width="1.5"/></svg>`,
		'anthropic': `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 20L12 4L15 20M9 14H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
		'azure-openai': `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 22V12M2 7L12 12M12 12L22 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
		'github-copilot': `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.475 2 2 6.475 2 12C2 16.425 4.8625 20.1625 8.8375 21.4875C9.3375 21.575 9.525 21.275 9.525 21.0125C9.525 20.775 9.5125 19.9875 9.5125 19.15C7 19.6125 6.35 18.5375 6.15 17.975C6.0375 17.6875 5.55 16.8 5.125 16.5625C4.775 16.375 4.275 15.9125 5.1125 15.9C5.9 15.8875 6.4625 16.625 6.65 16.925C7.55 18.4375 8.9875 18.0125 9.5625 17.75C9.65 17.1 9.9125 16.6625 10.2 16.4125C7.975 16.1625 5.65 15.3 5.65 11.475C5.65 10.3875 6.0375 9.4875 6.675 8.7875C6.575 8.5375 6.225 7.5125 6.775 6.1375C6.775 6.1375 7.6125 5.875 9.525 7.1625C10.325 6.9375 11.175 6.825 12.025 6.825C12.875 6.825 13.725 6.9375 14.525 7.1625C16.4375 5.8625 17.275 6.1375 17.275 6.1375C17.825 7.5125 17.475 8.5375 17.375 8.7875C18.0125 9.4875 18.4 10.375 18.4 11.475C18.4 15.3125 16.0625 16.1625 13.8375 16.4125C14.2 16.725 14.5125 17.325 14.5125 18.2625C14.5125 19.6 14.5 20.675 14.5 21.0125C14.5 21.275 14.6875 21.5875 15.1875 21.4875C19.1375 20.1625 22 16.4125 22 12C22 6.475 17.525 2 12 2Z" fill="currentColor"/></svg>`,
		'gemini': `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
		'groq': `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="7" height="7" stroke="currentColor" stroke-width="1.5"/><rect x="13" y="4" width="7" height="7" stroke="currentColor" stroke-width="1.5"/><rect x="4" y="13" width="7" height="7" stroke="currentColor" stroke-width="1.5"/><rect x="13" y="13" width="7" height="7" stroke="currentColor" stroke-width="1.5"/></svg>`,
		'ollama': `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.5"/><path d="M12 3V7M12 17V21M21 12H17M7 12H3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
		'qwen': `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="5" width="16" height="3" stroke="currentColor" stroke-width="1.5"/><rect x="4" y="10.5" width="16" height="3" stroke="currentColor" stroke-width="1.5"/><rect x="4" y="16" width="16" height="3" stroke="currentColor" stroke-width="1.5"/></svg>`,
		'free-qwen': `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="5" width="16" height="3" stroke="currentColor" stroke-width="1.5"/><rect x="4" y="10.5" width="16" height="3" stroke="currentColor" stroke-width="1.5"/><rect x="4" y="16" width="16" height="3" stroke="currentColor" stroke-width="1.5"/><circle cx="18" cy="6" r="2.5" fill="var(--text-success)" stroke="currentColor" stroke-width="0.5"/></svg>`,
		'free-deepseek': `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L4 6V18L12 22L20 18V6L12 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 8V16M8 10L12 12L16 10M8 14L12 16L16 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="18" cy="6" r="2.5" fill="var(--text-success)" stroke="currentColor" stroke-width="0.5"/></svg>`,
		'hugging-chat': `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="10" r="2" fill="currentColor"/><circle cx="16" cy="10" r="2" fill="currentColor"/><path d="M8 15C8 15 10 17 12 17C14 17 16 15 16 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M6 6C6 4 8 3 12 3C16 3 18 4 18 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M20 10C20 10 21 10 21 11C21 12 20 12 20 12M4 10C4 10 3 10 3 11C3 12 4 12 4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
		'openai-compatible': `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="6" cy="12" r="2" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="6" r="2" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="18" r="2" stroke="currentColor" stroke-width="1.5"/><circle cx="18" cy="12" r="2" stroke="currentColor" stroke-width="1.5"/><path d="M6 12H8M16 12H18M12 8V6M12 18V16" stroke="currentColor" stroke-width="1.5"/></svg>`,
		'siliconflow': `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="6" cy="12" r="2" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="6" r="2" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="18" r="2" stroke="currentColor" stroke-width="1.5"/><circle cx="18" cy="12" r="2" stroke="currentColor" stroke-width="1.5"/><path d="M6 12H8M16 12H18M12 8V6M12 18V16" stroke="currentColor" stroke-width="1.5"/></svg>`,
		'kimi': `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="6" cy="12" r="2" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="6" r="2" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="18" r="2" stroke="currentColor" stroke-width="1.5"/><circle cx="18" cy="12" r="2" stroke="currentColor" stroke-width="1.5"/><path d="M6 12H8M16 12H18M12 8V6M12 18V16" stroke="currentColor" stroke-width="1.5"/></svg>`,
		'opencode': `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M8 9L11 12L8 15M13 15H16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
	};
	return logos[type] || logos['openai-compatible'];
}
