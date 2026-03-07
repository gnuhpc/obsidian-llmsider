/**
 * WebLLM Provider
 * 
 * Wraps the WebLLM Manager as a standard BaseLLMProvider,
 * integrating local WebGPU inference into the existing
 * Connection + Model architecture.
 */

import { BaseLLMProvider } from './base-provider';
import { ChatMessage, LLMResponse, StreamingResponse } from '../types';
import { UnifiedTool } from '../tools/unified-tool-manager';
import { Logger } from '../utils/logger';
import { WebLLMManager } from '../core/webllm/webllm-manager';
import { WEBLLM_MODELS } from '../core/webllm/webllm-models';
import { requestUrl } from 'obsidian';

export class WebLLMProviderImpl extends BaseLLMProvider {
    private webllmManager: WebLLMManager;

    constructor(config: any, webllmManager: WebLLMManager) {
        super({
            ...config,
            apiKey: 'local', // Not needed for local inference
        });
        this.webllmManager = webllmManager;
    }

    getProviderName(): string {
        return 'webllm';
    }

    supportsVision(): boolean {
        return false; // WebLLM models don't support vision currently
    }

    /**
     * Ensure the model is loaded before inference
     */
    private async ensureModelLoaded(): Promise<void> {
        if (!this.webllmManager.isReady()) {
            Logger.debug('[WebLLM Provider] Model not loaded, loading:', this.model);
            await this.webllmManager.loadModel(this.model);
        }
    }

    /**
     * Convert ChatMessage[] to the format expected by WebLLM
     */
    private convertMessages(messages: ChatMessage[], systemMessage?: string): Array<{ role: string; content: string }> {
        const converted: Array<{ role: string; content: string }> = [];

        // Add system message if provided
        if (systemMessage) {
            converted.push({ role: 'system', content: systemMessage });
        }

        for (const msg of messages) {
            let content: string;
            if (typeof msg.content === 'string') {
                content = msg.content;
            } else if (Array.isArray(msg.content)) {
                // Extract text from multimodal content
                content = msg.content
                    .filter(c => c.type === 'text')
                    .map(c => (c as any).text)
                    .join('\n');
            } else {
                content = String(msg.content);
            }

            converted.push({
                role: msg.role,
                content,
            });
        }

        return converted;
    }

    async sendMessage(
        messages: ChatMessage[],
        tools?: UnifiedTool[],
        systemMessage?: string
    ): Promise<LLMResponse> {
        await this.ensureModelLoaded();

        const convertedMessages = this.convertMessages(messages, systemMessage);

        try {
            const result = await this.webllmManager.chat(convertedMessages, {
                temperature: this.temperature,
                maxTokens: this.maxTokens,
            });

            return {
                content: result.content,
                model: this.model,
                usage: result.usage || {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0,
                },
                finishReason: 'stop',
                isLoaded: true,
                providerStatuses: {},
                metadata: {
                    provider: 'webllm',
                    local: true,
                },
            };
        } catch (error) {
            Logger.error('[WebLLM Provider] sendMessage error:', error);
            throw error;
        }
    }

    async sendStreamingMessage(
        messages: ChatMessage[],
        onChunk: (chunk: StreamingResponse) => void,
        abortSignal?: AbortSignal,
        tools?: UnifiedTool[],
        systemMessage?: string
    ): Promise<void> {
        await this.ensureModelLoaded();

        const convertedMessages = this.convertMessages(messages, systemMessage);

        try {
            const result = await this.webllmManager.chatStream(
                convertedMessages,
                (text: string, done: boolean) => {
                    if (done) {
                        // Don't send the final empty chunk here, we handle it below
                        return;
                    }
                    onChunk({
                        content: text,
                        delta: text,
                        done: false,
                        isComplete: false,
                    } as any);
                },
                {
                    temperature: this.temperature,
                    maxTokens: this.maxTokens,
                    abortSignal,
                }
            );

            // Send final done chunk with usage
            onChunk({
                content: '',
                delta: '',
                done: true,
                isComplete: true,
                finishReason: 'stop',
                usage: result.usage,
            } as any);
        } catch (error) {
            Logger.error('[WebLLM Provider] sendStreamingMessage error:', error);
            throw error;
        }
    }

    async listModels(): Promise<string[]> {
        try {
            const url = 'https://raw.githubusercontent.com/mlc-ai/web-llm/main/src/config.ts';
            const response = await requestUrl({ url });
            const text = response.text;

            const matches = text.matchAll(/model_id:\s*["']([^\"']+)["']/g);
            const models: string[] = [];
            const seen = new Set<string>();

            for (const match of matches) {
                const id = match[1];
                if (!seen.has(id)) {
                    seen.add(id);
                    models.push(id);
                }
            }

            if (models.length > 0) {
                return models;
            }
        } catch (error) {
            Logger.error('[WebLLM Provider] Failed to fetch remote models, falling back to local list:', error);
        }

        return WEBLLM_MODELS.map(m => m.id);
    }

    getModelName(): string {
        return this.model;
    }

    protected getAISDKModel(): unknown {
        // WebLLM doesn't use AI SDK - it has its own engine
        throw new Error('WebLLM provider does not use AI SDK');
    }

    protected getEndpointForLogging(): string {
        return 'local://webllm';
    }

    protected initializeModelConfig(): void {
        // No external API config needed for WebLLM
    }
}
