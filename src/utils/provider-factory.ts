/**
 * Factory for creating Provider instances from Connection + Model pairs
 */

import { LLMConnection, LLMModel } from '../types';
import { Logger } from '././logger';
import { BaseLLMProvider } from '../providers/base-provider';
import { OpenAIProviderImpl } from '../providers/openai-provider';
import { AnthropicProviderImpl } from '../providers/anthropic-provider';
import { QwenProviderImpl } from '../providers/qwen-provider';
import { FreeQwenProviderImpl } from '../providers/free-qwen-provider-impl';
import { FreeGeminiProviderImpl } from '../providers/free-gemini-provider-impl';
import { FreeDeepseekProviderImpl } from '../providers/free-deepseek-provider-impl';
import { OpenAICompatibleProviderImpl } from '../providers/openai-compatible-provider';
import { SiliconFlowProviderImpl } from '../providers/siliconflow-provider';
import { KimiProviderImpl } from '../providers/kimi-provider';
import { GitHubCopilotProviderImpl } from '../providers/github-copilot-provider';
import { HuggingChatProviderImpl } from '../providers/hugging-chat-provider';
import { OpenCodeProviderImpl } from '../providers/opencode-provider';

import { UnifiedToolManager } from '../tools/unified-tool-manager';

export class ProviderFactory {
	/**
	 * Create a provider instance from a connection and model
	 */
	static createProvider(
		connection: LLMConnection,
		model: LLMModel,
		toolManager: UnifiedToolManager
	): BaseLLMProvider {
		// Validate inputs
		this.validateConnection(connection);
		this.validateModel(model);

		// Check connection and model are linked
		if (model.connectionId !== connection.id) {
			throw new Error(
				`Model ${model.id} is not associated with connection ${connection.id}`
			);
		}

		// Create provider config object (mimics legacy LLMProvider interface)
		const providerConfig: any = {
			id: this.generateProviderId(connection.id, model.id),
			name: connection.type,
			displayName: this.getProviderDisplayName(connection, model),
			apiKey: connection.apiKey,
			baseUrl: connection.baseUrl,
			model: model.modelName,
			maxTokens: model.maxTokens,
			temperature: model.temperature,
			topP: model.topP,
			enabled: connection.enabled && model.enabled,
			organizationId: connection.organizationId,
			supportsVision: model.supportsVision,
			outputModalities: model.outputModalities,
			// GitHub Copilot specific fields
			githubToken: connection.githubToken,
			copilotToken: connection.copilotToken,
			tokenExpiry: connection.tokenExpiry,
			// Proxy configuration
			proxyEnabled: connection.proxyEnabled,
			proxyType: connection.proxyType,
			proxyHost: connection.proxyHost,
			proxyPort: connection.proxyPort,
			proxyAuth: connection.proxyAuth,
			proxyUsername: connection.proxyUsername,
			proxyPassword: connection.proxyPassword,
			toolManager: toolManager
		};

		Logger.debug(`[ProviderFactory] Creating provider ${connection.type} for model ${model.modelName} with supportsVision: ${model.supportsVision}`);


		// Create appropriate provider instance based on type
		switch (connection.type) {
			case 'openai':
				return new OpenAIProviderImpl(providerConfig);

			case 'anthropic':
				return new AnthropicProviderImpl(providerConfig);

		case 'qwen':
			return new QwenProviderImpl(providerConfig);

		case 'free-qwen':
			return new FreeQwenProviderImpl(providerConfig);

		case 'free-gemini':
			return new FreeGeminiProviderImpl(providerConfig);

		case 'free-deepseek':
			return new FreeDeepseekProviderImpl(providerConfig);

		case 'hugging-chat':
			return new HuggingChatProviderImpl(providerConfig);

		case 'github-copilot':
				Logger.debug('Creating GitHub Copilot provider:', {
					hasGithubToken: !!connection.githubToken,
					hasCopilotToken: !!connection.copilotToken,
					tokenExpiry: connection.tokenExpiry ? new Date(connection.tokenExpiry).toISOString() : 'none'
				});
				if (!connection.githubToken) {
					throw new Error('GitHub token is required for GitHub Copilot');
				}
				return new GitHubCopilotProviderImpl(providerConfig);

			case 'openai-compatible':
				if (!connection.baseUrl) {
					throw new Error('Base URL is required for OpenAI-compatible providers');
				}
				return new OpenAICompatibleProviderImpl(providerConfig);

			case 'siliconflow':
				if (!connection.baseUrl) {
					providerConfig.baseUrl = 'https://api.siliconflow.cn/v1';
				}
				return new SiliconFlowProviderImpl(providerConfig);

			case 'kimi':
				if (!connection.baseUrl) {
					providerConfig.baseUrl = 'https://api.moonshot.cn/v1';
				}
				return new KimiProviderImpl(providerConfig);

			case 'ollama':
				if (!connection.baseUrl) {
					throw new Error('Base URL is required for Ollama providers');
				}
				// Ollama uses OpenAI-compatible API
				return new OpenAICompatibleProviderImpl(providerConfig);

			case 'groq':
				// Groq uses OpenAI-compatible API
				// Set default baseUrl if not provided
				if (!connection.baseUrl) {
					providerConfig.baseUrl = 'https://api.groq.com/openai/v1';
				}
				return new OpenAICompatibleProviderImpl(providerConfig);

			case 'gemini':
				// Gemini uses OpenAI-compatible API (via Google AI Studio)
				// Set default baseUrl if not provided
				if (!connection.baseUrl) {
					providerConfig.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
				}
				return new OpenAICompatibleProviderImpl(providerConfig);

			case 'xai':
				// X.AI (Grok) uses OpenAI-compatible API
				// Set default baseUrl if not provided
				if (!connection.baseUrl) {
					providerConfig.baseUrl = 'https://api.x.ai/v1';
				}
				return new OpenAICompatibleProviderImpl(providerConfig);

		case 'openrouter':
			if (!connection.baseUrl) {
				providerConfig.baseUrl = 'https://openrouter.ai/api/v1';
			}
			return new OpenAICompatibleProviderImpl(providerConfig);

		case 'opencode':
			return new OpenCodeProviderImpl(providerConfig);

		case 'local':
			throw new Error(
				'Local connections are designed for embedding models only. ' +
				'Please use a cloud provider for chat models.'
			);

		default:
			throw new Error(`Unknown provider type: ${connection.type}`);
		}
	}

	/**
	 * Create provider with ID (convenience method that returns both)
	 */
	static createProviderWithId(
		connection: LLMConnection,
		model: LLMModel,
		toolManager: UnifiedToolManager
	): { provider: BaseLLMProvider; providerId: string } {
		const provider = this.createProvider(connection, model, toolManager);
		const providerId = this.generateProviderId(connection.id, model.id);
		return { provider, providerId };
	}

	/**
	 * Generate unique provider ID from connection and model IDs
	 * Format: connectionId::modelId
	 */
	static generateProviderId(connectionId: string, modelId: string): string {
		return `${connectionId}::${modelId}`;
	}

	/**
	 * Parse provider ID back to connection and model IDs
	 * Returns null if not in new format
	 */
	static parseProviderId(
		providerId: string
	): { connectionId: string; modelId: string } | null {
		if (!providerId.includes('::')) {
			return null; // Legacy format
		}

		const [connectionId, modelId] = providerId.split('::');
		if (!connectionId || !modelId) {
			return null;
		}

		return { connectionId, modelId };
	}

	/**
	 * Get display name for a provider (Connection + Model)
	 */
	static getProviderDisplayName(connection: LLMConnection, model: LLMModel): string {
		// Use model's custom name if available
		if (model.name) {
			return model.name;
		}

		// Otherwise generate from connection and model
		return `${connection.name} - ${model.modelName}`;
	}

	/**
	 * Get all valid provider combinations from connections and models
	 */
	static getValidProviderCombinations(
		connections: LLMConnection[],
		models: LLMModel[]
	): Array<{ connection: LLMConnection; model: LLMModel }> {
		const combinations: Array<{ connection: LLMConnection; model: LLMModel }> = [];

		for (const connection of connections) {
			if (!connection.enabled) continue;

			const connectionModels = models.filter(
				m => m.connectionId === connection.id && m.enabled
			);

			for (const model of connectionModels) {
				// Skip embedding models (they're not for chat providers)
				if (model.isEmbedding) {
					Logger.debug(
						`[ProviderFactory] Skipping embedding model ${model.id} - ` +
						'embedding models are not used for chat providers'
					);
					continue;
				}

			// Skip embedding-only connection types (local) for chat models
			if (connection.type === 'local') {
				Logger.warn(
					`[ProviderFactory] Skipping model ${model.id} from ${connection.type} connection - ` +
					'only embedding models are supported for this connection type'
				);
				continue;
			}

			// Skip GitHub Copilot connections without valid tokens (need at least one)
			if (connection.type === 'github-copilot') {
				Logger.debug(`Checking GitHub Copilot connection ${connection.id}:`, {
					hasGithubToken: !!connection.githubToken,
					hasCopilotToken: !!connection.copilotToken,
					tokenExpiry: connection.tokenExpiry ? new Date(connection.tokenExpiry).toISOString() : 'none'
				});
				
				if (!connection.githubToken && !connection.copilotToken) {
					Logger.warn(
						`[ProviderFactory] Skipping model ${model.id} from GitHub Copilot connection - ` +
						'authentication required'
					);
					continue;
				}
			}

			combinations.push({ connection, model });
		}
	}

	return combinations;
}	/**
	 * Validate connection object
	 */
	private static validateConnection(connection: LLMConnection): void {
		if (!connection.id) {
			throw new Error('Connection must have an ID');
		}
		if (!connection.type) {
			throw new Error('Connection must have a type');
		}
		// API key/token is required for most providers, except:
		// - ollama, local: local providers without auth
		// - github-copilot: uses OAuth tokens (githubToken/copilotToken)
		// Note: free-qwen and free-deepseek DO require tokens (stored in apiKey field)
		if (!connection.apiKey && !['ollama', 'local', 'github-copilot', 'opencode'].includes(connection.type)) {
			throw new Error('Connection must have an API key');
		}
		// GitHub Copilot specific validation - check if we have at least githubToken or copilotToken
		if (connection.type === 'github-copilot') {
			if (!connection.githubToken && !connection.copilotToken) {
				throw new Error('GitHub Copilot connection requires authentication. Please authenticate with GitHub.');
			}
			// If we only have githubToken but no copilotToken, it's OK - the provider will refresh it
		}
		if (connection.type === 'openai-compatible' && !connection.baseUrl) {
			throw new Error('OpenAI-compatible connection must have a base URL');
		}
		if (connection.type === 'ollama' && !connection.baseUrl) {
			throw new Error('Ollama connection must have a base URL');
		}
	}

	/**
	 * Validate model object
	 */
	private static validateModel(model: LLMModel): void {
		if (!model.id) {
			throw new Error('Model must have an ID');
		}
		if (!model.connectionId) {
			throw new Error('Model must have a connection ID');
		}
		if (!model.modelName) {
			throw new Error('Model must have a model name');
		}
	}
}
