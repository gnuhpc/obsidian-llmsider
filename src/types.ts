// Lite version types - only essential types for basic chat

export const CHAT_VIEW_TYPE = 'llmsider-lite-chat';

// Message types
export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
	role: MessageRole;
	content: string;
	timestamp: number;
	id: string;
}

export interface ChatSession {
	id: string;
	name: string;
	messages: ChatMessage[];
	created: number;
	updated: number;
	provider: string;
}

// Provider types
export type ProviderType = 'openai' | 'anthropic' | 'openai-compatible';

export interface LLMProvider {
	id: string;
	type: ProviderType;
	name: string;
	apiKey: string;
	baseUrl?: string;
	model: string;
	maxTokens: number;
	temperature: number;
	enabled: boolean;
}

export interface OpenAIProvider extends LLMProvider {
	type: 'openai';
	organizationId?: string;
}

export interface AnthropicProvider extends LLMProvider {
	type: 'anthropic';
}

export interface OpenAICompatibleProvider extends LLMProvider {
	type: 'openai-compatible';
	baseUrl: string;
}

// Settings
export interface LLMSiderLiteSettings {
	providers: LLMProvider[];
	activeProvider: string;
	chatSessions: ChatSession[];
	nextSessionId: number;
	maxChatHistory: number;
}

export const DEFAULT_SETTINGS: LLMSiderLiteSettings = {
	providers: [],
	activeProvider: '',
	chatSessions: [],
	nextSessionId: 1,
	maxChatHistory: 50
};

// Plugin state
export interface PluginState {
	isLoaded: boolean;
	activeView?: string;
}
