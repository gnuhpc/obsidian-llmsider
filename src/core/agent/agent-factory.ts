/**
 * Agent Factory - Unified Agent Creation
 * 
 * This factory provides a centralized way to create different types of agents
 * based on conversation mode. It ensures consistent configuration across all
 * agent types and simplifies agent instantiation.
 * 
 * Supported modes:
 * - normal: Simple Q&A without tools (NormalModeAgent)
 * - guided: Step-by-step with tool confirmation (future: GuidedModeAgent)
 * - agent: Autonomous plan-execute (MastraPlanExecuteProcessor)
 * 
 * Benefits:
 * - Single source of truth for agent creation
 * - Consistent Memory configuration across modes
 * - Easy to add new agent types
 * - Simplified testing and mocking
 */

import { Logger } from '../../utils/logger';
import LLMSiderPlugin from '../../main';
import { I18nManager } from '../../i18n/i18n-manager';
import { MemoryManager, MemoryConfig } from './memory-manager';
import { StreamingIndicatorManager } from '../../processors/helpers/streaming-indicator-manager';
import { NormalModeAgent } from './normal-mode-agent';
import { GuidedModeAgent } from './guided-mode-agent';
import { MastraAgent } from './mastra-agent';

/**
 * Conversation mode types
 */
export type ConversationMode = 'normal' | 'guided' | 'agent';

/**
 * Configuration for creating agents via factory
 */
export interface AgentFactoryConfig {
	/** Plugin instance */
	plugin: LLMSiderPlugin;
	/** I18n manager */
	i18n: I18nManager;
	/** Conversation mode */
	mode: ConversationMode;
	/** Thread ID for memory scoping (e.g., session ID) */
	threadId?: string;
	/** Resource ID for memory scoping (e.g., vault ID) */
	resourceId?: string;
	/** Optional: Shared memory manager instance */
	memoryManager?: MemoryManager;
	/** Optional: Memory configuration (if no memoryManager provided) */
	memoryConfig?: MemoryConfig;
	/** Optional: Streaming indicator manager */
	streamingManager?: StreamingIndicatorManager;
	/** Optional: Context manager for file references */
	contextManager?: any;
	/** Optional: Custom system prompt (for normal/guided mode) */
	systemPrompt?: string;
	/** Optional: Available tools (for guided mode) */
	tools?: Record<string, any>;
	/** Optional: Tool suggestion callback (for guided mode) */
	onToolSuggestion?: (toolCall: any) => Promise<boolean>;
}

/**
 * AgentFactory - Creates appropriate agent based on conversation mode
 * 
 * Usage:
 * ```typescript
 * // Create a shared memory manager
 * const memoryManager = new MemoryManager(plugin, i18n);
 * await memoryManager.initialize();
 * 
 * // Create normal mode agent
 * const normalAgent = await AgentFactory.createAgent({
 *   plugin,
 *   i18n,
 *   mode: 'normal',
 *   memoryManager,
 *   threadId: sessionId
 * });
 * 
 * await normalAgent.execute({
 *   messages: chatMessages,
 *   onStream: updateUI
 * });
 * ```
 */
export class AgentFactory {
	/**
	 * Create an agent instance based on conversation mode
	 * 
	 * @param config - Agent factory configuration
	 * @returns Initialized agent instance
	 */
	static async createAgent(config: AgentFactoryConfig): Promise<MastraAgent | NormalModeAgent> {
		try {
			Logger.debug('[AgentFactory] Creating agent for mode:', config.mode);
			
			// Generate default IDs if not provided
			const threadId = config.threadId || `thread-${Date.now()}`;
			const resourceId = config.resourceId || config.plugin.getResourceId();
			
			// Create or use provided memory manager
			let memoryManager = config.memoryManager;
			if (!memoryManager) {
				Logger.debug('[AgentFactory] Creating new MemoryManager instance');
				memoryManager = new MemoryManager(
					config.plugin,
					config.i18n,
					config.memoryConfig
				);
				await memoryManager.initialize();
			}
			
			// Create agent based on mode
			let agent: MastraAgent | NormalModeAgent;
			
			switch (config.mode) {
				case 'normal':
					agent = await this.createNormalModeAgent(
						config,
						memoryManager,
						threadId,
						resourceId
					);
					break;
					
			case 'guided':
				agent = await this.createGuidedModeAgent(
					config,
					memoryManager,
					threadId,
					resourceId
				);
				break;				case 'agent':
					// Plan-execute mode uses MastraPlanExecuteProcessor directly
					// This is not an agent instance but a processor
					throw new Error('Agent mode should use MastraPlanExecuteProcessor directly');
					
				default:
					throw new Error(`Unknown conversation mode: ${config.mode}`);
			}
			
			Logger.debug('[AgentFactory] Agent created successfully:', {
				mode: config.mode,
				threadId,
				resourceId,
				hasMemoryManager: !!memoryManager
			});
			
			return agent;
			
		} catch (error) {
			Logger.error('[AgentFactory] Failed to create agent:', error);
			throw error;
		}
	}
	
	/**
	 * Create Normal Mode Agent
	 */
	private static async createNormalModeAgent(
		config: AgentFactoryConfig,
		memoryManager: MemoryManager,
		threadId: string,
		resourceId: string
	): Promise<NormalModeAgent> {
		Logger.debug('[AgentFactory] Creating NormalModeAgent');
		
		const agent = new NormalModeAgent({
			plugin: config.plugin,
			i18n: config.i18n,
			name: 'Normal Chat Assistant',
			instructions: '', // Will be set during initialization
			memoryManager,
			threadId,
			resourceId,
			streamingManager: config.streamingManager,
			contextManager: config.contextManager,
			systemPrompt: config.systemPrompt,
			debug: config.plugin.settings.debugMode || false
		});
		
		// Initialize agent
		await agent.initialize({
			plugin: config.plugin,
			i18n: config.i18n,
			name: 'Normal Chat Assistant',
			instructions: '', // Will use default system prompt
			memoryManager,
			threadId,
			resourceId
		});
		
		return agent;
	}
	
	/**
	 * Create Guided Mode Agent
	 */
	private static async createGuidedModeAgent(
		config: AgentFactoryConfig,
		memoryManager: MemoryManager,
		threadId: string,
		resourceId: string
	): Promise<GuidedModeAgent> {
		Logger.debug('[AgentFactory] Creating GuidedModeAgent');
		
		// Validate tools are provided
		if (!config.tools || Object.keys(config.tools).length === 0) {
			throw new Error('Guided mode requires tools to be provided');
		}
		
		const agent = new GuidedModeAgent({
			plugin: config.plugin,
			i18n: config.i18n,
			name: 'Guided Chat Assistant',
			tools: config.tools,
			instructions: '', // Will be set during initialization
			memoryManager,
			threadId,
			resourceId,
			systemPrompt: config.systemPrompt,
			onToolSuggestion: config.onToolSuggestion,
			debug: config.plugin.settings.debugMode || false
		});
		
		// Initialize agent
		await agent.initialize({
			plugin: config.plugin,
			i18n: config.i18n,
			name: 'Guided Chat Assistant',
			tools: config.tools,
			instructions: '', // Will use default system prompt
			memoryManager,
			threadId,
			resourceId
		});
		
		return agent;
	}
	
	/**
	 * Create a shared memory manager for multiple agents
	 * 
	 * Use this when you want to maintain consistent memory across
	 * different conversation modes (e.g., switching from normal to agent mode)
	 * 
	 * @param plugin - Plugin instance
	 * @param i18n - I18n manager
	 * @param config - Optional memory configuration
	 * @returns Initialized MemoryManager instance
	 */
	static async createSharedMemoryManager(
		plugin: LLMSiderPlugin,
		i18n: I18nManager,
		config?: MemoryConfig
	): Promise<MemoryManager> {
		Logger.debug('[AgentFactory] Creating shared MemoryManager');
		
		const memoryManager = new MemoryManager(plugin, i18n, config);
		await memoryManager.initialize();
		
		Logger.debug('[AgentFactory] Shared MemoryManager created and initialized');
		
		return memoryManager;
	}
	
	/**
	 * Validate that all required dependencies are available
	 * Call this during plugin initialization to ensure agents can be created
	 * 
	 * @param plugin - Plugin instance
	 * @returns true if all dependencies are available
	 */
	static validateDependencies(plugin: LLMSiderPlugin): boolean {
		try {
			// Check if provider is available
			const provider = plugin.getActiveProvider();
			if (!provider) {
				Logger.warn('[AgentFactory] No active LLM provider configured');
				return false;
			}
			
			// Check if I18n manager is available
			const i18n = plugin.getI18nManager();
			if (!i18n) {
				Logger.warn('[AgentFactory] I18n manager not available');
				return false;
			}
			
			// Check if Memory dependencies are available
			// (Mastra Memory, Orama, etc. - these are checked during MemoryManager init)
			
			Logger.debug('[AgentFactory] All dependencies validated');
			return true;
			
		} catch (error) {
			Logger.error('[AgentFactory] Dependency validation failed:', error);
			return false;
		}
	}
}
