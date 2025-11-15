import { ProviderType } from '../../types';

// Provider type names mapping
export const PROVIDER_TYPE_NAMES: Record<string, string> = {
	'openai': 'OpenAI',
	'anthropic': 'Anthropic',
	'azure-openai': 'Azure OpenAI',
	'gemini': 'Gemini',
	'groq': 'Groq',
	'ollama': 'Ollama',
	'qwen': 'Qwen',
	'huggingface': 'Hugging Face',
	'github-copilot': 'GitHub Copilot',
	'openai-compatible': 'OpenAI-Compatible',
	'local': 'Local'
};

// Provider logos (SVG) for connection cards - colored versions
export const PROVIDER_CARD_LOGOS: Record<string, string> = {
	'openai': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/></svg>`,
	'anthropic': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.8 3L24 21h-4.3l-1.3-3.8h-6.6L10.5 21H6.2L12.4 3h5.4zm-2.7 4.6l-2.3 6.8h4.6l-2.3-6.8zM0 3h4.3l6.2 18H6.2L0 3z"/></svg>`,
	'azure-openai': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.61 2.63L6.67 8.47a.76.76 0 0 0-.21.72l2.02 8.03a.76.76 0 0 0 .64.56l7.98.83a.76.76 0 0 0 .7-.32l4.74-6.8a.76.76 0 0 0-.05-.89L14.4 2.65a.76.76 0 0 0-.79-.02zm-2.09 7.32l3.02-2.19 3.02 4.28-4.68.48-1.36-2.57zM8.19 9.96l1.96 7.75-3.17-5.49 1.21-2.26zm5.37 7.88l-4.54-.47 3.77-5.43.77 5.9zm1.32-6.25l-3.77-5.43 4.54.47-.77 4.96z"/></svg>`,
	'github-copilot': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.475 2 2 6.475 2 12C2 16.425 4.8625 20.1625 8.8375 21.4875C9.3375 21.575 9.525 21.275 9.525 21.0125C9.525 20.775 9.5125 19.9875 9.5125 19.15C7 19.6125 6.35 18.5375 6.15 17.975C6.0375 17.6875 5.55 16.8 5.125 16.5625C4.775 16.375 4.275 15.9125 5.1125 15.9C5.9 15.8875 6.4625 16.625 6.65 16.925C7.55 18.4375 8.9875 18.0125 9.5625 17.75C9.65 17.1 9.9125 16.6625 10.2 16.4125C7.975 16.1625 5.65 15.3 5.65 11.475C5.65 10.3875 6.0375 9.4875 6.675 8.7875C6.575 8.5375 6.225 7.5125 6.775 6.1375C6.775 6.1375 7.6125 5.875 9.525 7.1625C10.325 6.9375 11.175 6.825 12.025 6.825C12.875 6.825 13.725 6.9375 14.525 7.1625C16.4375 5.8625 17.275 6.1375 17.275 6.1375C17.825 7.5125 17.475 8.5375 17.375 8.7875C18.0125 9.4875 18.4 10.375 18.4 11.475C18.4 15.3125 16.0625 16.1625 13.8375 16.4125C14.2 16.725 14.5125 17.325 14.5125 18.2625C14.5125 19.6 14.5 20.675 14.5 21.0125C14.5 21.275 14.6875 21.5875 15.1875 21.4875C19.1375 20.1625 22 16.4125 22 12C22 6.475 17.525 2 12 2Z"/></svg>`,
	'gemini': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2.182c5.423 0 9.818 4.395 9.818 9.818 0 5.423-4.395 9.818-9.818 9.818-5.423 0-9.818-4.395-9.818-9.818 0-5.423 4.395-9.818 9.818-9.818zm-1.636 3.273v4.363H6.545v2.364h3.818v4.363h2.364v-4.363h3.818v-2.364h-3.818V5.455z"/></svg>`,
	'groq': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18L19.82 8 12 11.82 4.18 8 12 4.18zM4 9.48l7 3.5v7.04l-7-3.5V9.48zm9 10.54v-7.04l7-3.5v7.04l-7 3.5z"/></svg>`,
	'ollama': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a2 2 0 0 1 2 2v1h3a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3h3V4a2 2 0 0 1 2-2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"/></svg>`,
	'qwen': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`,
	'huggingface': `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="10" r="2"/><circle cx="16" cy="10" r="2"/><path d="M12 14c2 0 4 1 4 3 0 2-2 3-4 3s-4-1-4-3c0-2 2-3 4-3z"/><path d="M6 6c0-2 2-3 6-3s6 1 6 3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>`,
	'openai-compatible': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.59 13.41c.41.39.41 1.03 0 1.42-.39.39-1.03.39-1.42 0-.39-.39-.39-1.03 0-1.42.39-.39 1.03-.39 1.42 0zm4.24.42c.39.39.39 1.03 0 1.42-.39.39-1.02.39-1.41 0-.39-.39-.39-1.03 0-1.42.39-.39 1.02-.39 1.41 0zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-12.5c-2.33 0-4.32 1.45-5.12 3.5h1.67c.69-1.19 1.97-2 3.45-2s2.75.81 3.45 2h1.67c-.8-2.05-2.79-3.5-5.12-3.5z"/></svg>`
};

// Provider badge logos (line-style SVG) for connection/model badges
export const PROVIDER_BADGE_LOGOS: Record<string, string> = {
	'openai': `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C10.3431 2 9 3.34315 9 5V7C9 8.65685 10.3431 10 12 10C13.6569 10 15 8.65685 15 7V5C15 3.34315 13.6569 2 12 2Z" stroke="currentColor" stroke-width="1.5"/><path d="M19 9C17.3431 9 16 10.3431 16 12C16 13.6569 17.3431 15 19 15C20.6569 15 22 13.6569 22 12C22 10.3431 20.6569 9 19 9Z" stroke="currentColor" stroke-width="1.5"/><path d="M5 9C3.34315 9 2 10.3431 2 12C2 13.6569 3.34315 15 5 15C6.65685 15 8 13.6569 8 12C8 10.3431 6.65685 9 5 9Z" stroke="currentColor" stroke-width="1.5"/><path d="M12 14C10.3431 14 9 15.3431 9 17V19C9 20.6569 10.3431 22 12 22C13.6569 22 15 20.6569 15 19V17C15 15.3431 13.6569 14 12 14Z" stroke="currentColor" stroke-width="1.5"/><path d="M12 10L19 12M12 10L5 12M12 14L19 12M12 14L5 12" stroke="currentColor" stroke-width="1.5"/></svg>`,
	'anthropic': `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 20L12 4L15 20M9 14H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
	'azure-openai': `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 22V12M2 7L12 12M12 12L22 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
	'github-copilot': `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.475 2 2 6.475 2 12C2 16.425 4.8625 20.1625 8.8375 21.4875C9.3375 21.575 9.525 21.275 9.525 21.0125C9.525 20.775 9.5125 19.9875 9.5125 19.15C7 19.6125 6.35 18.5375 6.15 17.975C6.0375 17.6875 5.55 16.8 5.125 16.5625C4.775 16.375 4.275 15.9125 5.1125 15.9C5.9 15.8875 6.4625 16.625 6.65 16.925C7.55 18.4375 8.9875 18.0125 9.5625 17.75C9.65 17.1 9.9125 16.6625 10.2 16.4125C7.975 16.1625 5.65 15.3 5.65 11.475C5.65 10.3875 6.0375 9.4875 6.675 8.7875C6.575 8.5375 6.225 7.5125 6.775 6.1375C6.775 6.1375 7.6125 5.875 9.525 7.1625C10.325 6.9375 11.175 6.825 12.025 6.825C12.875 6.825 13.725 6.9375 14.525 7.1625C16.4375 5.8625 17.275 6.1375 17.275 6.1375C17.825 7.5125 17.475 8.5375 17.375 8.7875C18.0125 9.4875 18.4 10.375 18.4 11.475C18.4 15.3125 16.0625 16.1625 13.8375 16.4125C14.2 16.725 14.5125 17.325 14.5125 18.2625C14.5125 19.6 14.5 20.675 14.5 21.0125C14.5 21.275 14.6875 21.5875 15.1875 21.4875C19.1375 20.1625 22 16.4125 22 12C22 6.475 17.525 2 12 2Z" fill="currentColor"/></svg>`,
	'gemini': `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
	'groq': `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="7" height="7" stroke="currentColor" stroke-width="1.5"/><rect x="13" y="4" width="7" height="7" stroke="currentColor" stroke-width="1.5"/><rect x="4" y="13" width="7" height="7" stroke="currentColor" stroke-width="1.5"/><rect x="13" y="13" width="7" height="7" stroke="currentColor" stroke-width="1.5"/></svg>`,
	'ollama': `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.5"/><path d="M12 3V7M12 17V21M21 12H17M7 12H3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
	'qwen': `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="5" width="16" height="3" stroke="currentColor" stroke-width="1.5"/><rect x="4" y="10.5" width="16" height="3" stroke="currentColor" stroke-width="1.5"/><rect x="4" y="16" width="16" height="3" stroke="currentColor" stroke-width="1.5"/></svg>`,
	'huggingface': `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="10" r="2" stroke="currentColor" stroke-width="1.5"/><circle cx="16" cy="10" r="2" stroke="currentColor" stroke-width="1.5"/><path d="M12 14C14 14 16 15 16 17C16 19 14 20 12 20C10 20 8 19 8 17C8 15 10 14 12 14Z" stroke="currentColor" stroke-width="1.5"/><path d="M6 6C6 4 8 3 12 3C16 3 18 4 18 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
	'openai-compatible': `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="6" cy="12" r="2" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="6" r="2" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="18" r="2" stroke="currentColor" stroke-width="1.5"/><circle cx="18" cy="12" r="2" stroke="currentColor" stroke-width="1.5"/><path d="M6 12H8M16 12H18M12 8V6M12 18V16" stroke="currentColor" stroke-width="1.5"/></svg>`
};

// Helper functions
export function getProviderTypeName(type: string): string {
	return PROVIDER_TYPE_NAMES[type] || type.toUpperCase();
}

export function getProviderCardLogo(type: string): string {
	return PROVIDER_CARD_LOGOS[type] || PROVIDER_CARD_LOGOS['openai-compatible'];
}

export function getProviderBadgeLogo(type: string): string {
	return PROVIDER_BADGE_LOGOS[type] || PROVIDER_BADGE_LOGOS['openai-compatible'];
}

// Alias for backward compatibility
export function getProviderLogo(type: string): string {
	return getProviderCardLogo(type);
}
