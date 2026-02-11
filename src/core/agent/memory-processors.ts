/**
 * Custom Memory Processors for LLMSider
 * 
 * These processors filter, transform, and compact messages retrieved from memory
 * before they're sent to the LLM, helping manage context window limits and
 * optimize token usage during long conversations.
 */

import { CoreMessage } from '@mastra/core/llm';
import { MemoryProcessor, MemoryProcessorOpts } from '@mastra/core/memory';
import { generateText } from 'ai';
import { Logger } from '../../utils/logger';
import { TokenManager } from '../../utils/token-manager';
import { ChatMessage } from '../../types';

/**
 * Configuration for ConversationCompactor
 */
export interface CompactorConfig {
	/**
	 * Maximum tokens allowed before compaction is triggered
	 * @default 8000
	 */
	tokenThreshold: number;

	/**
	 * Target token count after compaction
	 * Should be significantly lower than tokenThreshold to avoid frequent compactions
	 * @default 4000
	 */
	targetTokens: number;

	/**
	 * Number of most recent messages to preserve without compaction
	 * These messages remain in their original form
	 * @default 4
	 */
	preserveRecentCount: number;

	/**
	 * AI model provider function for generating summaries
	 * Should return a model compatible with AI SDK's generateText
	 */
	modelProvider: () => any;

	/**
	 * Custom system prompt for the compaction LLM
	 * If not provided, uses default summarization prompt
	 */
	compactionPrompt?: string;
}

/**
 * ConversationCompactor - Intelligent conversation history compaction
 * 
 * This processor monitors token usage in conversation history and performs
 * intelligent compaction when the threshold is exceeded. It:
 * 
 * 1. Preserves the most recent N messages in their original form
 * 2. Summarizes older messages using an LLM
 * 3. Replaces the summarized messages with a compact system message
 * 4. Maintains conversation continuity and important context
 * 
 * Example usage (agent input processors):
 * ```typescript
 * import { ConversationCompactor } from './memory-processors';
 * import { openai } from '@ai-sdk/openai';
 * 
 * const agent = new Agent({
 *   inputProcessors: [
 *     new ConversationCompactor({
 *       tokenThreshold: 8000,
 *       targetTokens: 4000,
 *       preserveRecentCount: 4,
 *       modelProvider: () => openai('gpt-4o-mini'),
 *     }),
 *   ],
 * });
 * ```
 */
export class ConversationCompactor extends MemoryProcessor {
	private tokenThreshold: number;
	private targetTokens: number;
	private preserveRecentCount: number;
	private modelProvider: () => any;
	private compactionPrompt: string;

	constructor(config: CompactorConfig) {
		super({ name: 'ConversationCompactor' });

		this.tokenThreshold = config.tokenThreshold || 8000;
		this.targetTokens = config.targetTokens || 4000;
		this.preserveRecentCount = config.preserveRecentCount || 4;
		this.modelProvider = config.modelProvider;
		this.compactionPrompt = config.compactionPrompt || this.getDefaultPrompt();

		// Validate configuration
		if (this.targetTokens >= this.tokenThreshold) {
			Logger.warn('[ConversationCompactor] targetTokens should be significantly lower than tokenThreshold');
		}
	}

	/**
	 * Process messages: count tokens and compact if necessary
	 */
	async process(
		messages: CoreMessage[],
		_opts: MemoryProcessorOpts = {}
	): Promise<CoreMessage[]> {
		if (messages.length === 0) {
			return messages;
		}

		// Count total tokens
		const totalTokens = this.countTokens(messages);
		Logger.debug('[ConversationCompactor] 📊 Current tokens:', totalTokens, '/', this.tokenThreshold);

		// Check if compaction is needed
		if (totalTokens <= this.tokenThreshold) {
			Logger.debug('[ConversationCompactor] ✅ Token count within threshold, no compaction needed');
			return messages;
		}

		Logger.debug('[ConversationCompactor] ⚠️  Token threshold exceeded, starting compaction...');

		try {
			const compactedMessages = await this.compactMessages(messages);
			const newTokenCount = this.countTokens(compactedMessages);
			
			Logger.debug('[ConversationCompactor] ✅ Compaction complete:', {
				originalTokens: totalTokens,
				newTokens: newTokenCount,
				reduction: `${((1 - newTokenCount / totalTokens) * 100).toFixed(1)}%`,
				originalMessages: messages.length,
				newMessages: compactedMessages.length
			});

			return compactedMessages;
		} catch (error) {
			Logger.error('[ConversationCompactor] ❌ Compaction failed:', error);
			// On error, fall back to simple truncation to preserve recent messages
			Logger.warn('[ConversationCompactor] Falling back to simple truncation');
			return this.simpleTruncation(messages);
		}
	}

	/**
	 * Perform intelligent message compaction
	 */
	private async compactMessages(messages: CoreMessage[]): Promise<CoreMessage[]> {
		// Split messages into old (to be compacted) and recent (to preserve)
		const preserveCount = Math.min(this.preserveRecentCount, messages.length);
		const recentMessages = messages.slice(-preserveCount);
		const oldMessages = messages.slice(0, -preserveCount);

		if (oldMessages.length === 0) {
			// All messages are recent, no compaction possible
			Logger.debug('[ConversationCompactor] All messages are recent, performing simple truncation');
			return this.simpleTruncation(messages);
		}

		Logger.debug('[ConversationCompactor] 📝 Summarizing', oldMessages.length, 'older messages...');

		// Generate summary of old messages
		const summary = await this.generateSummary(oldMessages);

		// Create a system message with the summary
		const summaryMessage: CoreMessage = {
			role: 'system',
			content: `[Conversation History Summary]\nThe following is a summary of earlier conversation history to save context space:\n\n${summary}\n\n[End of Summary - Recent messages follow]`
		};

		// Combine summary with recent messages
		const compactedMessages = [summaryMessage, ...recentMessages];

		// Check if we achieved target token reduction
		const compactedTokens = this.countTokens(compactedMessages);
		if (compactedTokens > this.targetTokens) {
			Logger.warn('[ConversationCompactor] Compacted size still exceeds target, may need more aggressive settings');
		}

		return compactedMessages;
	}

	/**
	 * Generate a summary of messages using LLM
	 */
	private async generateSummary(messages: CoreMessage[]): Promise<string> {
		// Format messages for summarization
		const conversationText = messages
			.map(msg => {
				const role = msg.role === 'user' ? 'User' : 
							msg.role === 'assistant' ? 'Assistant' : 
							msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
				
				let content = '';
				if (typeof msg.content === 'string') {
					content = msg.content;
				} else if (Array.isArray(msg.content)) {
					content = msg.content
						.map(part => part.type === 'text' ? part.text : `[${part.type}]`)
						.join(' ');
				}
				
				return `${role}: ${content}`;
			})
			.join('\n\n');

		const model = this.modelProvider();

		const { text } = await generateText({
			model,
			messages: [
				{
					role: 'system',
					content: this.compactionPrompt
				},
				{
					role: 'user',
					content: conversationText
				}
			],
			temperature: 0.3, // Lower temperature for more consistent summaries
			maxRetries: 2,
		});

		return text;
	}

	/**
	 * Simple truncation fallback - keeps only recent messages
	 */
	private simpleTruncation(messages: CoreMessage[]): CoreMessage[] {
		const preserveCount = Math.min(this.preserveRecentCount, messages.length);
		return messages.slice(-preserveCount);
	}

	/**
	 * Count tokens in messages using the existing TokenManager
	 */
	private countTokens(messages: CoreMessage[]): number {
		// Convert CoreMessage to ChatMessage format for TokenManager
		const chatMessages: ChatMessage[] = messages.map((msg, idx) => {
			let content: string | any[];
			
			if (typeof msg.content === 'string') {
				content = msg.content;
			} else if (Array.isArray(msg.content)) {
				content = msg.content.map(part => {
					if (part.type === 'text') {
						return { type: 'text' as const, text: part.text };
					} else {
						// Handle image content
						return {
							type: 'image' as const,
							source: {
								type: 'base64' as const,
								media_type: 'image/png' as const,
								data: ''
							}
						};
					}
				});
			} else {
				content = '';
			}

			return {
				id: `msg-${idx}`,
				role: msg.role as 'user' | 'assistant' | 'system',
				content,
				timestamp: Date.now()
			};
		});

		// Use TokenManager to estimate tokens
		return TokenManager.estimateTokensForMessages(chatMessages);
	}

	/**
	 * Default prompt for conversation summarization
	 */
	private getDefaultPrompt(): string {
		return `You are a conversation summarization assistant. Your task is to create a concise but comprehensive summary of a conversation history.

Your summary should:
1. Capture all key topics discussed and decisions made
2. Preserve important facts, data, and user preferences mentioned
3. Maintain chronological flow where relevant
4. Focus on information that would be useful for continuing the conversation
5. Use clear, concise language
6. Be formatted as a narrative summary (not bullet points unless necessary)

Guidelines:
- Preserve specific details like names, numbers, dates, and technical terms
- Include any user instructions or preferences stated
- Note any unresolved questions or pending tasks
- Omit redundant pleasantries and filler
- Target summary length: approximately 25% (one quarter) of the original length
- Do NOT compress too aggressively - maintain enough detail to preserve context
- Focus on removing redundancy while keeping all meaningful information

Provide only the summary text without any meta-commentary.`;
	}
}

/**
 * ConversationOnlyFilter - Filter out non-conversation messages
 * 
 * Removes system messages, tool calls, and other non-conversational content,
 * keeping only user and assistant messages for cleaner context.
 */
export class ConversationOnlyFilter extends MemoryProcessor {
	constructor() {
		super({ name: 'ConversationOnlyFilter' });
	}

	process(
		messages: CoreMessage[],
		_opts: MemoryProcessorOpts = {}
	): CoreMessage[] {
		return messages.filter(
			msg => msg.role === 'user' || msg.role === 'assistant'
		);
	}
}

/**
 * RecentMessagesFilter - Keep only the most recent N messages
 * 
 * Simple processor that truncates message history to a fixed count.
 * Useful for strict message count limits.
 */
export class RecentMessagesFilter extends MemoryProcessor {
	private limit: number;

	constructor(limit: number = 20) {
		super({ name: 'RecentMessagesFilter' });
		this.limit = limit;
	}

	process(
		messages: CoreMessage[],
		_opts: MemoryProcessorOpts = {}
	): CoreMessage[] {
		if (messages.length <= this.limit) {
			return messages;
		}
		return messages.slice(-this.limit);
	}
}
