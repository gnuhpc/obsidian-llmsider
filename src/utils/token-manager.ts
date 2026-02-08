import { ChatMessage, MessageContent, TextContent } from '../types';
import { Logger } from '././logger';

export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

export interface TokenCountResult {
    tokenCount: number;
    characterCount: number;
    estimatedCost?: number;
}

export class TokenManager {
    // Approximate tokens per character ratio for different content types
    private static readonly TOKENS_PER_CHAR_TEXT = 0.25; // ~4 characters per token
    private static readonly TOKENS_PER_CHAR_CODE = 0.3;  // Code is more token-dense
    private static readonly TOKENS_PER_IMAGE = 765;      // Base token cost for image analysis
    public static readonly MAX_CONTEXT_TOKENS = 120000;  // Conservative limit below 128k - now public
    private static readonly BUFFER_TOKENS = 8000;        // Reserve for response

    // Model-specific token limits (both context window and rate limits)
    private static readonly MODEL_LIMITS: Record<string, { contextWindow: number; rateLimit?: number }> = {
        // Groq models with strict rate limits (TPM)
        'moonshotai/kimi-k2-instruct': { contextWindow: 8192, rateLimit: 10000 },
        'llama-3.3-70b-versatile': { contextWindow: 128000, rateLimit: 20000 },
        'llama-3.1-70b-versatile': { contextWindow: 128000, rateLimit: 20000 },
        'llama-3.1-8b-instant': { contextWindow: 128000, rateLimit: 20000 },
        'mixtral-8x7b-32768': { contextWindow: 32768, rateLimit: 20000 },
        'gemma2-9b-it': { contextWindow: 8192, rateLimit: 15000 },
        // Common models
        'gpt-4': { contextWindow: 8192 },
        'gpt-4-turbo': { contextWindow: 128000 },
        'gpt-4o': { contextWindow: 128000 },
        'gpt-3.5-turbo': { contextWindow: 16385 },
        'claude-3-opus': { contextWindow: 200000 },
        'claude-3-sonnet': { contextWindow: 200000 },
        'claude-3-haiku': { contextWindow: 200000 },
    };

    /**
     * Get effective token limit for a specific model
     * Returns the more restrictive of context window or rate limit
     */
    static getModelTokenLimit(modelName: string): number {
        const modelKey = Object.keys(this.MODEL_LIMITS).find(key => 
            modelName.toLowerCase().includes(key.toLowerCase())
        );

        if (modelKey) {
            const limits = this.MODEL_LIMITS[modelKey];
            // Use the more restrictive limit (rate limit is per minute, so we use 80% of it for safety)
            const effectiveRateLimit = limits.rateLimit ? Math.floor(limits.rateLimit * 0.8) : Infinity;
            return Math.min(limits.contextWindow, effectiveRateLimit);
        }

        // Default to conservative limit
        return this.MAX_CONTEXT_TOKENS;
    }

    /**
     * Convert token limit to character limit for file text extraction
     * Uses conservative text ratio (4 chars per token) to avoid token overflow
     * @param tokenLimit - Token limit from model context window
     * @returns Character limit for extractTextWithLimit
     */
    static tokenLimitToCharacterLimit(tokenLimit: number): number {
        // Use inverse of TOKENS_PER_CHAR_TEXT ratio for conservative estimation
        // 0.25 tokens/char => 4 chars/token
        const CHARS_PER_TOKEN = 1 / this.TOKENS_PER_CHAR_TEXT;
        return Math.floor(tokenLimit * CHARS_PER_TOKEN);
    }

    /**
     * Get character limit for a specific model
     * Convenience method that combines getModelTokenLimit and tokenLimitToCharacterLimit
     * @param modelName - Name of the model
     * @returns Character limit suitable for extractTextWithLimit
     */
    static getModelCharacterLimit(modelName: string): number {
        const tokenLimit = this.getModelTokenLimit(modelName);
        return this.tokenLimitToCharacterLimit(tokenLimit);
    }

    /**
     * Estimate token count for text content
     */
    static estimateTokensForText(text: string): number {
        if (!text) return 0;

        // Check if content looks like code (has common programming patterns)
        const codePatterns = [
            /function\s+\w+\s*\(/,
            /class\s+\w+/,
            /import\s+.*from/,
            /const\s+\w+\s*=/,
            /let\s+\w+\s*=/,
            /var\s+\w+\s*=/,
            /if\s*\([^)]+\)\s*{/,
            /for\s*\([^)]+\)\s*{/,
            /while\s*\([^)]+\)\s*{/,
            /\{[\s\S]*\}/,
            /```[\s\S]*```/
        ];

        const isCodeLike = codePatterns.some(pattern => pattern.test(text));
        const ratio = isCodeLike ? this.TOKENS_PER_CHAR_CODE : this.TOKENS_PER_CHAR_TEXT;

        return Math.ceil(text.length * ratio);
    }

    /**
     * Estimate token count for a chat message
     */
    static estimateTokensForMessage(message: ChatMessage): number {
        let tokenCount = 4; // Base overhead for role and message structure

        if (typeof message.content === 'string') {
            tokenCount += this.estimateTokensForText(message.content);
        } else {
            // Multimodal content
            message.content.forEach((content: MessageContent) => {
                if (content.type === 'text') {
                    const textContent = content;
                    tokenCount += this.estimateTokensForText(textContent.text);
                } else if (content.type === 'image') {
                    tokenCount += this.TOKENS_PER_IMAGE;
                }
            });
        }

        return tokenCount;
    }

    /**
     * Estimate token count for an array of messages
     */
    static estimateTokensForMessages(messages: ChatMessage[]): number {
        let totalTokens = 0;

        messages.forEach(message => {
            totalTokens += this.estimateTokensForMessage(message);
        });

        // Add overhead for conversation structure
        totalTokens += messages.length * 2; // Additional overhead per message

        return totalTokens;
    }

    /**
     * Estimate token count for system prompt/context
     */
    static estimateTokensForContext(contextPrompt: string): number {
        if (!contextPrompt) return 0;
        return this.estimateTokensForText(contextPrompt) + 10; // Small overhead for system role
    }

    /**
     * Check if the total token count exceeds limits
     */
    static isTokenLimitExceeded(
        messages: ChatMessage[],
        contextPrompt: string = '',
        tools?: unknown[],
        modelName?: string
    ): boolean {
        const messageTokens = this.estimateTokensForMessages(messages);
        const contextTokens = this.estimateTokensForContext(contextPrompt);
        const toolTokens = tools ? this.estimateTokensForTools(tools) : 0;
        const bufferTokens = this.BUFFER_TOKENS;

        const totalTokens = messageTokens + contextTokens + toolTokens + bufferTokens;
        const effectiveLimit = modelName ? this.getModelTokenLimit(modelName) : this.MAX_CONTEXT_TOKENS;

        Logger.debug('Token usage check:', {
            messageTokens,
            contextTokens,
            toolTokens,
            bufferTokens,
            totalTokens,
            modelName: modelName || 'default',
            limit: effectiveLimit,
            exceeded: totalTokens > effectiveLimit
        });

        return totalTokens > effectiveLimit;
    }

    /**
     * Estimate token count for tools
     */
    static estimateTokensForTools(tools: unknown[]): number {
        if (!tools || tools.length === 0) return 0;

        // Rough estimation: each tool definition takes ~50-200 tokens depending on complexity
        const avgTokensPerTool = 100;
        return tools.length * avgTokensPerTool;
    }

    /**
     * Truncate messages to fit within token limits
     */
    static truncateMessagesToFitTokens(
        messages: ChatMessage[],
        contextPrompt: string = '',
        tools?: unknown[],
        modelName?: string
    ): ChatMessage[] {
        if (!this.isTokenLimitExceeded(messages, contextPrompt, tools, modelName)) {
            return messages;
        }

        Logger.debug('Token limit exceeded, truncating messages...');

        const contextTokens = this.estimateTokensForContext(contextPrompt);
        const toolTokens = tools ? this.estimateTokensForTools(tools) : 0;
        const bufferTokens = this.BUFFER_TOKENS;
        const effectiveLimit = modelName ? this.getModelTokenLimit(modelName) : this.MAX_CONTEXT_TOKENS;
        const availableTokens = effectiveLimit - contextTokens - toolTokens - bufferTokens;

        // Always keep the last user message (most recent)
        if (messages.length === 0) return messages;

        const truncatedMessages: ChatMessage[] = [];
        let currentTokens = 0;

        // Process messages from newest to oldest
        for (let i = messages.length - 1; i >= 0; i--) {
            const message = messages[i];
            const messageTokens = this.estimateTokensForMessage(message);

            if (currentTokens + messageTokens <= availableTokens) {
                truncatedMessages.unshift(message);
                currentTokens += messageTokens;
            } else {
                // If this is the first (most recent) message and it's too large, try to truncate its content
                if (i === messages.length - 1 && truncatedMessages.length === 0) {
                    const truncatedMessage = this.truncateMessageContent(message, availableTokens);
                    if (truncatedMessage) {
                        truncatedMessages.unshift(truncatedMessage);
                        currentTokens += this.estimateTokensForMessage(truncatedMessage);
                    }
                }
                break;
            }
        }

        const removedCount = messages.length - truncatedMessages.length;
        Logger.debug('Message truncation completed:', {
            originalCount: messages.length,
            truncatedCount: truncatedMessages.length,
            removedCount,
            finalTokens: this.estimateTokensForMessages(truncatedMessages),
            availableTokens
        });

        return truncatedMessages;
    }

    /**
     * Truncate individual message content if it's too large
     */
    private static truncateMessageContent(message: ChatMessage, maxTokens: number): ChatMessage | null {
        if (typeof message.content === 'string') {
            const maxChars = Math.floor(maxTokens / this.TOKENS_PER_CHAR_TEXT);
            if (message.content.length > maxChars) {
                Logger.debug('Truncating message content:', {
                    originalLength: message.content.length,
                    truncatedLength: maxChars
                });

                return {
                    ...message,
                    content: message.content.substring(0, maxChars) + '\n\n[Content truncated due to token limit]'
                };
            }
        } else {
            // For multimodal content, try to preserve images but truncate text
            let totalTokens = 0;
            const truncatedContent: MessageContent[] = [];

            for (const content of message.content) {
                const contentTokens = content.type === 'text'
                    ? this.estimateTokensForText((content).text)
                    : this.TOKENS_PER_IMAGE;

                if (totalTokens + contentTokens <= maxTokens) {
                    truncatedContent.push(content);
                    totalTokens += contentTokens;
                } else if (content.type === 'text') {
                    // Try to partially include text content
                    const remainingTokens = maxTokens - totalTokens;
                    const maxChars = Math.floor(remainingTokens / this.TOKENS_PER_CHAR_TEXT);

                    if (maxChars > 100) { // Only include if meaningful amount of text can fit
                        const textContent = content;
                        truncatedContent.push({
                            ...textContent,
                            text: textContent.text.substring(0, maxChars) + '\n[Truncated]'
                        });
                    }
                    break;
                } else {
                    // Skip remaining images if no tokens left
                    break;
                }
            }

            if (truncatedContent.length > 0) {
                return {
                    ...message,
                    content: truncatedContent
                };
            }
        }

        return null;
    }

    /**
     * Truncate context prompt to fit within token limits
     */
    static truncateContextPrompt(contextPrompt: string, maxTokens: number): string {
        if (!contextPrompt) return '';

        const estimatedTokens = this.estimateTokensForContext(contextPrompt);
        if (estimatedTokens <= maxTokens) {
            return contextPrompt;
        }

        const maxChars = Math.floor(maxTokens / this.TOKENS_PER_CHAR_TEXT);
        const truncatedContent = contextPrompt.substring(0, maxChars);

        Logger.debug('Context prompt truncated:', {
            originalTokens: estimatedTokens,
            maxTokens,
            originalLength: contextPrompt.length,
            truncatedLength: truncatedContent.length
        });

        return truncatedContent + '\n\n[Context truncated due to token limit]';
    }

    /**
     * Get recommended action when token limit is exceeded
     */
    static getTokenLimitRecommendation(
        messages: ChatMessage[],
        contextPrompt: string = ''
    ): string {
        const messageTokens = this.estimateTokensForMessages(messages);
        const contextTokens = this.estimateTokensForContext(contextPrompt);

        if (contextTokens > messageTokens) {
            return 'Consider reducing the amount of context (notes, files) included in your conversation.';
        } else {
            return 'Consider starting a new chat session to reduce the conversation history.';
        }
    }

    /**
     * Format token usage for display
     */
    static formatTokenUsage(tokenCount: number): string {
        if (tokenCount < 1000) {
            return `${tokenCount} tokens`;
        } else if (tokenCount < 10000) {
            return `${(tokenCount / 1000).toFixed(1)}K tokens`;
        } else {
            return `${(tokenCount / 1000).toFixed(0)}K tokens`;
        }
    }

    /**
     * Get token usage warning level
     */
    static getTokenWarningLevel(tokenCount: number): 'safe' | 'warning' | 'critical' {
        const ratio = tokenCount / this.MAX_CONTEXT_TOKENS;

        if (ratio < 0.7) return 'safe';
        if (ratio < 0.9) return 'warning';
        return 'critical';
    }

    /**
     * Calculate estimated cost based on token usage (rough estimation)
     */
    static estimateCost(usage: TokenUsage, model: string = ''): number {
        // Very rough cost estimation in USD - actual costs vary by provider and model
        const inputCostPer1KTokens = model.toLowerCase().includes('gpt-4') ? 0.03 : 0.001;
        const outputCostPer1KTokens = model.toLowerCase().includes('gpt-4') ? 0.06 : 0.002;

        const inputCost = (usage.promptTokens / 1000) * inputCostPer1KTokens;
        const outputCost = (usage.completionTokens / 1000) * outputCostPer1KTokens;

        return inputCost + outputCost;
    }
}