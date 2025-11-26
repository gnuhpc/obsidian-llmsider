// Main plugin file for LLMSider

import { Plugin, WorkspaceLeaf } from 'obsidian';
import { Logger } from './utils/logger';
import { LLMSiderLiteSettings, DEFAULT_SETTINGS, CHAT_VIEW_TYPE, ChatSession, OpenAIProvider as OpenAIProviderType } from './types';
import { LLMSiderLiteSettingTab } from './settings';
import { ChatView } from './ui/chat-view';
import { OpenAIProvider } from './providers/openai-provider';
import { AnthropicProvider } from './providers/anthropic-provider';
import { OpenAICompatibleProvider } from './providers/openai-compatible-provider';
import { BaseLLMProvider } from './providers/base-provider';

export default class LLMSiderLitePlugin extends Plugin {
	settings!: LLMSiderLiteSettings;
	providers: Map<string, BaseLLMProvider> = new Map();

	async onload() {
		Logger.debug('Loading LLMSider plugin...');

		await this.loadSettings();
		this.initializeProviders();

		// Register views
		this.registerView(CHAT_VIEW_TYPE, (leaf) => new ChatView(leaf, this));

		// Add ribbon icon
		this.addRibbonIcon('message-circle', 'Open chat', () => {
			void this.activateChatView();
		});

		// Register command
		this.addCommand({
			id: 'open-chat',
			name: 'Open chat',
			callback: () => {
				void this.activateChatView();
			}
		});

		// Add settings tab
		this.addSettingTab(new LLMSiderLiteSettingTab(this.app, this));

		// Defer chat view initialization until workspace is ready
		this.app.workspace.onLayoutReady(() => {
			void this.activateChatView();
		});

		Logger.debug('LLMSider plugin loaded successfully');
	}

	onunload() {
		Logger.debug('Unloading LLMSider plugin...');
		this.providers.clear();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.initializeProviders();

		// Notify chat view
		const chatLeaves = this.app.workspace.getLeavesOfType(CHAT_VIEW_TYPE);
		if (chatLeaves.length > 0) {
			const chatView = chatLeaves[0].view as ChatView;
			chatView.onProviderChanged();
		}
	}

	private initializeProviders() {
		this.providers.clear();

		for (const provider of this.settings.providers) {
			if (!provider.enabled) continue;

			try {
				let instance: BaseLLMProvider | null = null;

				switch (provider.type) {
				case 'openai':
					instance = new OpenAIProvider(
						provider.apiKey,
						provider.model,
						provider.maxTokens,
						provider.temperature,
						'organizationId' in provider ? (provider as OpenAIProviderType).organizationId : undefined
					);
					break;

				case 'anthropic':
						instance = new AnthropicProvider(
							provider.apiKey,
							provider.model,
							provider.maxTokens,
							provider.temperature
						);
						break;

					case 'openai-compatible':
						if (!provider.baseUrl) {
							Logger.warn(`OpenAI-compatible provider ${provider.name} missing baseUrl`);
							continue;
						}
						// Validate baseUrl format
						try {
							const url = new URL(provider.baseUrl);
							if (!['http:', 'https:'].includes(url.protocol)) {
								Logger.warn(`OpenAI-compatible provider ${provider.name} has invalid protocol in baseUrl: ${provider.baseUrl}`);
								continue;
							}
						} catch {
							Logger.warn(`OpenAI-compatible provider ${provider.name} has invalid baseUrl format: ${provider.baseUrl}`);
							continue;
						}
						instance = new OpenAICompatibleProvider(
							provider.apiKey,
							provider.model,
							provider.baseUrl,
							provider.maxTokens,
							provider.temperature
						);
						break;

					default:
						Logger.warn(`Unknown provider type: ${String(provider.type)}`);
				}

				if (instance) {
					this.providers.set(provider.id, instance);
					Logger.debug(`Initialized provider: ${provider.name}`);
				}
			} catch (error: unknown) {
				Logger.error(`Failed to initialize provider ${provider.name}:`, error);
			}
		}

		// Set active provider if not set or invalid
		if (!this.settings.activeProvider || !this.providers.has(this.settings.activeProvider)) {
			const firstProvider = Array.from(this.providers.keys())[0];
			if (firstProvider) {
				this.settings.activeProvider = firstProvider;
				void this.saveSettings();
			}
		}
	}

	getActiveProvider(): BaseLLMProvider | null {
		if (!this.settings.activeProvider) return null;
		return this.providers.get(this.settings.activeProvider) || null;
	}

	getAvailableProviders(): Array<{ id: string; name: string }> {
		return this.settings.providers
			.filter(p => p.enabled && this.providers.has(p.id))
			.map(p => ({ id: p.id, name: p.name }));
	}

	setActiveProvider(providerId: string): void {
		this.settings.activeProvider = providerId;
		void this.saveSettings();
	}

	async activateChatView() {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(CHAT_VIEW_TYPE);

		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			leaf = workspace.getLeaf(true);
			if (leaf) {
				try {
					await leaf.setViewState({ type: CHAT_VIEW_TYPE });
				} catch (err: unknown) {
					Logger.error('Failed to set view state:', err);
				}
			}
		}

		if (leaf) {
			void workspace.revealLeaf(leaf);
		}
	}

	async createChatSession(name?: string): Promise<ChatSession> {
		const sessionId = this.settings.nextSessionId.toString();
		this.settings.nextSessionId++;

		const session: ChatSession = {
			id: sessionId,
			name: name || 'New Chat',
			messages: [],
			created: Date.now(),
			updated: Date.now(),
			provider: this.settings.activeProvider
		};

		this.settings.chatSessions.unshift(session);

		// Limit chat history
		if (this.settings.chatSessions.length > this.settings.maxChatHistory) {
			this.settings.chatSessions = this.settings.chatSessions.slice(0, this.settings.maxChatHistory);
		}

		await this.saveSettings();
		return session;
	}

	async updateChatSession(sessionId: string, updates: Partial<ChatSession>): Promise<void> {
		const sessionIndex = this.settings.chatSessions.findIndex(s => s.id === sessionId);
		if (sessionIndex >= 0) {
			this.settings.chatSessions[sessionIndex] = {
				...this.settings.chatSessions[sessionIndex],
				...updates,
				updated: Date.now()
			};
			await this.saveSettings();
		}
	}
}
