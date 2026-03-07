/**
 * WebLLM Manager
 * 
 * Manages the lifecycle of the WebLLM engine:
 * - WebGPU availability detection
 * - Model downloading with progress tracking
 * - Engine initialization and teardown
 * - Chat inference (streaming and non-streaming)
 * - Model cache management
 */

import { Logger } from '../../utils/logger';
import { WEBLLM_MODELS, getWebLLMModelById, type WebLLMModelInfo } from './webllm-models';

// WebLLM types - dynamically imported to avoid bundling issues
type MLCEngine = import('@mlc-ai/web-llm').MLCEngine;
type InitProgressReport = { progress: number; timeElapsed: number; text: string };
type ChatCompletionMessageParam = { role: string; content: string };

export interface WebLLMStatus {
    available: boolean;            // Whether WebGPU is available
    engineState: 'idle' | 'downloading' | 'loading' | 'ready' | 'error';
    currentModel?: string;         // Currently loaded model ID
    downloadProgress?: number;     // Download progress 0-100
    downloadText?: string;         // Current progress text
    error?: string;                // Error message if any
    gpuInfo?: string;              // GPU adapter info
}

export type WebLLMStatusCallback = (status: WebLLMStatus) => void;

export class WebLLMManager {
    private engine: MLCEngine | null = null;
    private status: WebLLMStatus = {
        available: false,
        engineState: 'idle',
    };
    private statusCallbacks: Set<WebLLMStatusCallback> = new Set();
    private isDestroyed = false;

    constructor() {
        // Check WebGPU on construction
        this.checkWebGPUSupport().then(available => {
            this.status.available = available;
        });
    }

    /**
     * Check if WebGPU is supported in the current environment
     */
    async checkWebGPUSupport(): Promise<boolean> {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const nav = navigator as any;
            if (typeof navigator === 'undefined' || !nav.gpu) {
                Logger.debug('[WebLLM] navigator.gpu not available');
                this.status.available = false;
                return false;
            }

            const adapter = await nav.gpu.requestAdapter();
            if (!adapter) {
                Logger.debug('[WebLLM] No WebGPU adapter found');
                this.status.available = false;
                return false;
            }

            // Get GPU info
            const info = await adapter.requestAdapterInfo?.();
            if (info) {
                this.status.gpuInfo = `${info.vendor || 'Unknown'} - ${info.description || info.device || 'GPU'}`;
                Logger.debug('[WebLLM] GPU adapter info:', this.status.gpuInfo);
            }
            this.status.available = true;
            return true;
        } catch (error) {
            Logger.error('[WebLLM] WebGPU detection failed:', error);
            this.status.available = false;
            return false;
        }
    }

    /**
     * Load a model (downloads if not cached, then initializes engine)
     */
    async loadModel(modelId: string): Promise<void> {
        if (this.isDestroyed) {
            throw new Error('WebLLM Manager has been destroyed');
        }

        // Check WebGPU support
        const hasWebGPU = await this.checkWebGPUSupport();
        if (!hasWebGPU) {
            this.updateStatus({
                engineState: 'error',
                error: 'WebGPU is not supported on this device. Please ensure your GPU drivers are up to date.',
            });
            throw new Error('WebGPU is not supported');
        }

        // Unload current model if different
        if (this.engine && this.status.currentModel !== modelId) {
            await this.unloadModel();
        }

        // Skip if already loaded
        if (this.status.engineState === 'ready' && this.status.currentModel === modelId) {
            Logger.debug('[WebLLM] Model already loaded:', modelId);
            return;
        }

        try {
            this.updateStatus({
                engineState: 'downloading',
                downloadProgress: 0,
                downloadText: 'Initializing...',
                error: undefined,
            });

            // Dynamically import WebLLM to avoid bundling it eagerly
            const webllm = await import('@mlc-ai/web-llm');

            // Get model config for context window
            const modelInfo = getWebLLMModelById(modelId);
            const contextWindowSize = modelInfo?.contextWindowSize || 2048;

            Logger.debug('[WebLLM] Loading model:', modelId, 'context:', contextWindowSize);

            // Use CreateMLCEngine (main thread) for simplicity and compatibility
            // WebWorkerMLCEngine can have issues with Electron's worker bundling
            this.engine = await webllm.CreateMLCEngine(
                modelId,
                {
                    initProgressCallback: (report: InitProgressReport) => {
                        const progress = Math.round(report.progress * 100);
                        const isDownloading = report.text.toLowerCase().includes('download') ||
                            report.text.toLowerCase().includes('fetch') ||
                            progress < 95;

                        this.updateStatus({
                            engineState: isDownloading ? 'downloading' : 'loading',
                            downloadProgress: progress,
                            downloadText: report.text,
                        });

                        Logger.debug(`[WebLLM] Progress: ${progress}% - ${report.text}`);
                    },
                    logLevel: 'SILENT',
                },
                {
                    context_window_size: contextWindowSize,
                }
            );

            this.updateStatus({
                engineState: 'ready',
                currentModel: modelId,
                downloadProgress: 100,
                downloadText: 'Model loaded successfully',
                error: undefined,
            });

            Logger.debug('[WebLLM] Model loaded successfully:', modelId);

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            Logger.error('[WebLLM] Failed to load model:', error);

            this.updateStatus({
                engineState: 'error',
                error: errorMsg,
                downloadProgress: 0,
            });

            this.engine = null;
            throw error;
        }
    }

    /**
     * Unload the current model and release resources
     */
    async unloadModel(): Promise<void> {
        if (this.engine) {
            try {
                await this.engine.unload();
                Logger.debug('[WebLLM] Model unloaded');
            } catch (error) {
                Logger.error('[WebLLM] Error unloading model:', error);
            }
            this.engine = null;
        }

        this.updateStatus({
            engineState: 'idle',
            currentModel: undefined,
            downloadProgress: undefined,
            downloadText: undefined,
            error: undefined,
        });
    }

    /**
     * Get the current status
     */
    getStatus(): WebLLMStatus {
        return { ...this.status };
    }

    /**
     * Register a callback for status changes
     * Returns an unsubscribe function
     */
    onStatusChange(callback: WebLLMStatusCallback): () => void {
        this.statusCallbacks.add(callback);
        // Immediately send current status
        callback({ ...this.status });
        return () => {
            this.statusCallbacks.delete(callback);
        };
    }

    /**
     * Check if the engine is ready for inference
     */
    isReady(): boolean {
        return this.engine !== null && this.status.engineState === 'ready';
    }

    /**
     * Non-streaming chat completion
     */
    async chat(
        messages: ChatCompletionMessageParam[],
        options?: {
            temperature?: number;
            maxTokens?: number;
        }
    ): Promise<{
        content: string;
        usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
    }> {
        if (!this.engine || !this.isReady()) {
            throw new Error('WebLLM engine is not ready. Please load a model first.');
        }

        try {
            const response = await this.engine.chat.completions.create({
                messages: messages as any,
                temperature: options?.temperature ?? 0.7,
                max_tokens: options?.maxTokens,
            });

            const content = response.choices[0]?.message?.content || '';
            const usage = response.usage ? {
                promptTokens: response.usage.prompt_tokens || 0,
                completionTokens: response.usage.completion_tokens || 0,
                totalTokens: response.usage.total_tokens || 0,
            } : undefined;

            return { content, usage };
        } catch (error) {
            Logger.error('[WebLLM] Chat error:', error);
            throw error;
        }
    }

    /**
     * Streaming chat completion
     */
    async chatStream(
        messages: ChatCompletionMessageParam[],
        onChunk: (text: string, done: boolean) => void,
        options?: {
            temperature?: number;
            maxTokens?: number;
            abortSignal?: AbortSignal;
        }
    ): Promise<{
        fullMessage: string;
        usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
    }> {
        if (!this.engine || !this.isReady()) {
            throw new Error('WebLLM engine is not ready. Please load a model first.');
        }

        try {
            const chunks = await this.engine.chat.completions.create({
                messages: messages as any,
                temperature: options?.temperature ?? 0.7,
                max_tokens: options?.maxTokens,
                stream: true,
                stream_options: { include_usage: true },
            });

            let fullMessage = '';
            let usage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined;

            for await (const chunk of chunks) {
                // Check abort signal
                if (options?.abortSignal?.aborted) {
                    this.engine.interruptGenerate();
                    break;
                }

                const delta = chunk.choices[0]?.delta?.content || '';
                fullMessage += delta;

                if (delta) {
                    onChunk(delta, false);
                }

                if (chunk.usage) {
                    usage = {
                        promptTokens: chunk.usage.prompt_tokens || 0,
                        completionTokens: chunk.usage.completion_tokens || 0,
                        totalTokens: chunk.usage.total_tokens || 0,
                    };
                }
            }

            onChunk('', true);

            return { fullMessage, usage };
        } catch (error) {
            Logger.error('[WebLLM] Streaming chat error:', error);
            throw error;
        }
    }

    /**
     * Clear model cache from IndexedDB
     */
    async clearCache(modelId?: string): Promise<void> {
        try {
            const webllm = await import('@mlc-ai/web-llm');
            if (modelId) {
                await webllm.deleteModelAllInfoInCache(modelId);
                Logger.debug('[WebLLM] Cache cleared for model:', modelId);
            } else {
                // Clear all cached models
                for (const model of WEBLLM_MODELS) {
                    try {
                        await webllm.deleteModelAllInfoInCache(model.id);
                    } catch {
                        // Ignore errors for models that aren't cached
                    }
                }
                Logger.debug('[WebLLM] All model caches cleared');
            }
        } catch (error) {
            Logger.error('[WebLLM] Error clearing cache:', error);
            throw error;
        }
    }

    /**
     * Check if a model is cached in IndexedDB
     */
    async isModelCached(modelId: string): Promise<boolean> {
        try {
            const webllm = await import('@mlc-ai/web-llm');
            const cached = await webllm.hasModelInCache(modelId);
            return cached;
        } catch (error) {
            Logger.debug('[WebLLM] Error checking cache for model:', modelId, error);
            return false;
        }
    }

    /**
     * Get list of available models with cache status
     */
    async getModelsWithCacheStatus(): Promise<(WebLLMModelInfo & { cached: boolean })[]> {
        const results = [];
        for (const model of WEBLLM_MODELS) {
            const cached = await this.isModelCached(model.id);
            results.push({ ...model, cached });
        }
        return results;
    }

    /**
     * Destroy the manager and release all resources
     */
    async destroy(): Promise<void> {
        this.isDestroyed = true;
        await this.unloadModel();
        this.statusCallbacks.clear();
        Logger.debug('[WebLLM] Manager destroyed');
    }

    /**
     * Get the currently loaded model's name
     */
    getCurrentModelName(): string | undefined {
        if (this.status.currentModel) {
            const modelInfo = getWebLLMModelById(this.status.currentModel);
            return modelInfo?.name || this.status.currentModel;
        }
        return undefined;
    }

    /**
     * Update status and notify all listeners
     */
    private updateStatus(partial: Partial<WebLLMStatus>): void {
        this.status = { ...this.status, ...partial };
        for (const callback of this.statusCallbacks) {
            try {
                callback({ ...this.status });
            } catch (error) {
                Logger.error('[WebLLM] Status callback error:', error);
            }
        }
    }
}
