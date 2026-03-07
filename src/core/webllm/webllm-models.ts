/**
 * WebLLM 支持的本地模型定义
 */

export interface WebLLMModelInfo {
    id: string;                    // WebLLM 模型 ID
    name: string;                  // 显示名称
    size: string;                  // 估计模型大小
    description: string;           // 模型描述
    descriptionZh: string;         // 中文描述
    quantization: string;          // 量化方式
    contextWindowSize: number;     // 默认上下文窗口大小
    recommended?: boolean;         // 是否推荐
}

/**
 * 支持的 WebLLM 模型列表
 * 从官方配置自动生成：https://github.com/mlc-ai/web-llm/blob/main/src/config.ts
 */
export const WEBLLM_MODELS: WebLLMModelInfo[] = [
    {
        id: "Llama-3.2-1B-Instruct-q4f32_1-MLC",
        name: "Llama-3.2-1B-Instruct-q4f32_1",
        size: "~900MB",
        description: "Model Llama-3.2-1B-Instruct-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Llama-3.2-1B-Instruct-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 2048,
        recommended: false
    },
    {
        id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
        name: "Llama-3.2-1B-Instruct-q4f16_1",
        size: "~900MB",
        description: "Model Llama-3.2-1B-Instruct-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Llama-3.2-1B-Instruct-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 2048,
        recommended: false
    },
    {
        id: "Llama-3.2-1B-Instruct-q0f32-MLC",
        name: "Llama-3.2-1B-Instruct-q0f32",
        size: "~900MB",
        description: "Model Llama-3.2-1B-Instruct-q0f32 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Llama-3.2-1B-Instruct-q0f32 模型",
        quantization: "other",
        contextWindowSize: 2048,
        recommended: false
    },
    {
        id: "Llama-3.2-1B-Instruct-q0f16-MLC",
        name: "Llama-3.2-1B-Instruct-q0f16",
        size: "~900MB",
        description: "Model Llama-3.2-1B-Instruct-q0f16 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Llama-3.2-1B-Instruct-q0f16 模型",
        quantization: "other",
        contextWindowSize: 2048,
        recommended: false
    },
    {
        id: "Llama-3.2-3B-Instruct-q4f32_1-MLC",
        name: "Llama-3.2-3B-Instruct-q4f32_1",
        size: "~1.8GB",
        description: "Model Llama-3.2-3B-Instruct-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Llama-3.2-3B-Instruct-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Llama-3.2-3B-Instruct-q4f16_1-MLC",
        name: "Llama-3.2-3B-Instruct-q4f16_1",
        size: "~1.8GB",
        description: "Model Llama-3.2-3B-Instruct-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Llama-3.2-3B-Instruct-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Llama-3.1-8B-Instruct-q4f32_1-MLC-1k",
        name: "Llama-3.1-8B-Instruct-q4f32_1-1k",
        size: "~4GB",
        description: "Model Llama-3.1-8B-Instruct-q4f32_1-1k provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Llama-3.1-8B-Instruct-q4f32_1-1k 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Llama-3.1-8B-Instruct-q4f16_1-MLC-1k",
        name: "Llama-3.1-8B-Instruct-q4f16_1-1k",
        size: "~4GB",
        description: "Model Llama-3.1-8B-Instruct-q4f16_1-1k provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Llama-3.1-8B-Instruct-q4f16_1-1k 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Llama-3.1-8B-Instruct-q4f32_1-MLC",
        name: "Llama-3.1-8B-Instruct-q4f32_1",
        size: "~4GB",
        description: "Model Llama-3.1-8B-Instruct-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Llama-3.1-8B-Instruct-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Llama-3.1-8B-Instruct-q4f16_1-MLC",
        name: "Llama-3.1-8B-Instruct-q4f16_1",
        size: "~4GB",
        description: "Model Llama-3.1-8B-Instruct-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Llama-3.1-8B-Instruct-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "DeepSeek-R1-Distill-Qwen-1.5B-q4f16_1-MLC",
        name: "DeepSeek-R1-Distill-Qwen-1.5B-q4f16_1",
        size: "~900MB",
        description: "Model DeepSeek-R1-Distill-Qwen-1.5B-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 DeepSeek-R1-Distill-Qwen-1.5B-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "DeepSeek-R1-Distill-Qwen-1.5B-q4f32_1-MLC",
        name: "DeepSeek-R1-Distill-Qwen-1.5B-q4f32_1",
        size: "~900MB",
        description: "Model DeepSeek-R1-Distill-Qwen-1.5B-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 DeepSeek-R1-Distill-Qwen-1.5B-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC",
        name: "DeepSeek-R1-Distill-Qwen-7B-q4f16_1",
        size: "~4GB",
        description: "Model DeepSeek-R1-Distill-Qwen-7B-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 DeepSeek-R1-Distill-Qwen-7B-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "DeepSeek-R1-Distill-Qwen-7B-q4f32_1-MLC",
        name: "DeepSeek-R1-Distill-Qwen-7B-q4f32_1",
        size: "~4GB",
        description: "Model DeepSeek-R1-Distill-Qwen-7B-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 DeepSeek-R1-Distill-Qwen-7B-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "DeepSeek-R1-Distill-Llama-8B-q4f32_1-MLC",
        name: "DeepSeek-R1-Distill-Llama-8B-q4f32_1",
        size: "~4GB",
        description: "Model DeepSeek-R1-Distill-Llama-8B-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 DeepSeek-R1-Distill-Llama-8B-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "DeepSeek-R1-Distill-Llama-8B-q4f16_1-MLC",
        name: "DeepSeek-R1-Distill-Llama-8B-q4f16_1",
        size: "~4GB",
        description: "Model DeepSeek-R1-Distill-Llama-8B-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 DeepSeek-R1-Distill-Llama-8B-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Hermes-2-Theta-Llama-3-8B-q4f16_1-MLC",
        name: "Hermes-2-Theta-Llama-3-8B-q4f16_1",
        size: "~4GB",
        description: "Model Hermes-2-Theta-Llama-3-8B-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Hermes-2-Theta-Llama-3-8B-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Hermes-2-Theta-Llama-3-8B-q4f32_1-MLC",
        name: "Hermes-2-Theta-Llama-3-8B-q4f32_1",
        size: "~4GB",
        description: "Model Hermes-2-Theta-Llama-3-8B-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Hermes-2-Theta-Llama-3-8B-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Hermes-2-Pro-Llama-3-8B-q4f16_1-MLC",
        name: "Hermes-2-Pro-Llama-3-8B-q4f16_1",
        size: "~4GB",
        description: "Model Hermes-2-Pro-Llama-3-8B-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Hermes-2-Pro-Llama-3-8B-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Hermes-2-Pro-Llama-3-8B-q4f32_1-MLC",
        name: "Hermes-2-Pro-Llama-3-8B-q4f32_1",
        size: "~4GB",
        description: "Model Hermes-2-Pro-Llama-3-8B-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Hermes-2-Pro-Llama-3-8B-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Hermes-3-Llama-3.2-3B-q4f32_1-MLC",
        name: "Hermes-3-Llama-3.2-3B-q4f32_1",
        size: "~1.8GB",
        description: "Model Hermes-3-Llama-3.2-3B-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Hermes-3-Llama-3.2-3B-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Hermes-3-Llama-3.2-3B-q4f16_1-MLC",
        name: "Hermes-3-Llama-3.2-3B-q4f16_1",
        size: "~1.8GB",
        description: "Model Hermes-3-Llama-3.2-3B-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Hermes-3-Llama-3.2-3B-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Hermes-3-Llama-3.1-8B-q4f32_1-MLC",
        name: "Hermes-3-Llama-3.1-8B-q4f32_1",
        size: "~4GB",
        description: "Model Hermes-3-Llama-3.1-8B-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Hermes-3-Llama-3.1-8B-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Hermes-3-Llama-3.1-8B-q4f16_1-MLC",
        name: "Hermes-3-Llama-3.1-8B-q4f16_1",
        size: "~4GB",
        description: "Model Hermes-3-Llama-3.1-8B-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Hermes-3-Llama-3.1-8B-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Hermes-2-Pro-Mistral-7B-q4f16_1-MLC",
        name: "Hermes-2-Pro-Mistral-7B-q4f16_1",
        size: "~4GB",
        description: "Model Hermes-2-Pro-Mistral-7B-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Hermes-2-Pro-Mistral-7B-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Phi-3.5-mini-instruct-q4f16_1-MLC",
        name: "Phi-3.5-mini-instruct-q4f16_1",
        size: "Unknown",
        description: "Model Phi-3.5-mini-instruct-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Phi-3.5-mini-instruct-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Phi-3.5-mini-instruct-q4f32_1-MLC",
        name: "Phi-3.5-mini-instruct-q4f32_1",
        size: "Unknown",
        description: "Model Phi-3.5-mini-instruct-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Phi-3.5-mini-instruct-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Phi-3.5-mini-instruct-q4f16_1-MLC-1k",
        name: "Phi-3.5-mini-instruct-q4f16_1-1k",
        size: "Unknown",
        description: "Model Phi-3.5-mini-instruct-q4f16_1-1k provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Phi-3.5-mini-instruct-q4f16_1-1k 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Phi-3.5-mini-instruct-q4f32_1-MLC-1k",
        name: "Phi-3.5-mini-instruct-q4f32_1-1k",
        size: "Unknown",
        description: "Model Phi-3.5-mini-instruct-q4f32_1-1k provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Phi-3.5-mini-instruct-q4f32_1-1k 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Phi-3.5-vision-instruct-q4f16_1-MLC",
        name: "Phi-3.5-vision-instruct-q4f16_1",
        size: "Unknown",
        description: "Model Phi-3.5-vision-instruct-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Phi-3.5-vision-instruct-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Phi-3.5-vision-instruct-q4f32_1-MLC",
        name: "Phi-3.5-vision-instruct-q4f32_1",
        size: "Unknown",
        description: "Model Phi-3.5-vision-instruct-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Phi-3.5-vision-instruct-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Mistral-7B-Instruct-v0.3-q4f16_1-MLC",
        name: "Mistral-7B-Instruct-v0.3-q4f16_1",
        size: "~4GB",
        description: "Model Mistral-7B-Instruct-v0.3-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Mistral-7B-Instruct-v0.3-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Mistral-7B-Instruct-v0.3-q4f32_1-MLC",
        name: "Mistral-7B-Instruct-v0.3-q4f32_1",
        size: "~4GB",
        description: "Model Mistral-7B-Instruct-v0.3-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Mistral-7B-Instruct-v0.3-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Mistral-7B-Instruct-v0.2-q4f16_1-MLC",
        name: "Mistral-7B-Instruct-v0.2-q4f16_1",
        size: "~4GB",
        description: "Model Mistral-7B-Instruct-v0.2-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Mistral-7B-Instruct-v0.2-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "OpenHermes-2.5-Mistral-7B-q4f16_1-MLC",
        name: "OpenHermes-2.5-Mistral-7B-q4f16_1",
        size: "~4GB",
        description: "Model OpenHermes-2.5-Mistral-7B-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 OpenHermes-2.5-Mistral-7B-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "NeuralHermes-2.5-Mistral-7B-q4f16_1-MLC",
        name: "NeuralHermes-2.5-Mistral-7B-q4f16_1",
        size: "~4GB",
        description: "Model NeuralHermes-2.5-Mistral-7B-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 NeuralHermes-2.5-Mistral-7B-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "WizardMath-7B-V1.1-q4f16_1-MLC",
        name: "WizardMath-7B-V1.1-q4f16_1",
        size: "~4GB",
        description: "Model WizardMath-7B-V1.1-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 WizardMath-7B-V1.1-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "SmolLM2-1.7B-Instruct-q4f16_1-MLC",
        name: "SmolLM2-1.7B-Instruct-q4f16_1",
        size: "~4GB",
        description: "Model SmolLM2-1.7B-Instruct-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 SmolLM2-1.7B-Instruct-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "SmolLM2-1.7B-Instruct-q4f32_1-MLC",
        name: "SmolLM2-1.7B-Instruct-q4f32_1",
        size: "~4GB",
        description: "Model SmolLM2-1.7B-Instruct-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 SmolLM2-1.7B-Instruct-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "SmolLM2-360M-Instruct-q0f16-MLC",
        name: "SmolLM2-360M-Instruct-q0f16",
        size: "Unknown",
        description: "Model SmolLM2-360M-Instruct-q0f16 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 SmolLM2-360M-Instruct-q0f16 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "SmolLM2-360M-Instruct-q0f32-MLC",
        name: "SmolLM2-360M-Instruct-q0f32",
        size: "Unknown",
        description: "Model SmolLM2-360M-Instruct-q0f32 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 SmolLM2-360M-Instruct-q0f32 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "SmolLM2-360M-Instruct-q4f16_1-MLC",
        name: "SmolLM2-360M-Instruct-q4f16_1",
        size: "Unknown",
        description: "Model SmolLM2-360M-Instruct-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 SmolLM2-360M-Instruct-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "SmolLM2-360M-Instruct-q4f32_1-MLC",
        name: "SmolLM2-360M-Instruct-q4f32_1",
        size: "Unknown",
        description: "Model SmolLM2-360M-Instruct-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 SmolLM2-360M-Instruct-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "SmolLM2-135M-Instruct-q0f16-MLC",
        name: "SmolLM2-135M-Instruct-q0f16",
        size: "Unknown",
        description: "Model SmolLM2-135M-Instruct-q0f16 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 SmolLM2-135M-Instruct-q0f16 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "SmolLM2-135M-Instruct-q0f32-MLC",
        name: "SmolLM2-135M-Instruct-q0f32",
        size: "Unknown",
        description: "Model SmolLM2-135M-Instruct-q0f32 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 SmolLM2-135M-Instruct-q0f32 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "gemma-2-2b-it-q4f16_1-MLC",
        name: "gemma-2-2b-it-q4f16_1",
        size: "Unknown",
        description: "Model gemma-2-2b-it-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 gemma-2-2b-it-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "gemma-2-2b-it-q4f32_1-MLC",
        name: "gemma-2-2b-it-q4f32_1",
        size: "Unknown",
        description: "Model gemma-2-2b-it-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 gemma-2-2b-it-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "gemma-2-2b-it-q4f16_1-MLC-1k",
        name: "gemma-2-2b-it-q4f16_1-1k",
        size: "Unknown",
        description: "Model gemma-2-2b-it-q4f16_1-1k provided by WebLLM",
        descriptionZh: "WebLLM 提供的 gemma-2-2b-it-q4f16_1-1k 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "gemma-2-2b-it-q4f32_1-MLC-1k",
        name: "gemma-2-2b-it-q4f32_1-1k",
        size: "Unknown",
        description: "Model gemma-2-2b-it-q4f32_1-1k provided by WebLLM",
        descriptionZh: "WebLLM 提供的 gemma-2-2b-it-q4f32_1-1k 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "gemma-2-9b-it-q4f16_1-MLC",
        name: "gemma-2-9b-it-q4f16_1",
        size: "Unknown",
        description: "Model gemma-2-9b-it-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 gemma-2-9b-it-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "gemma-2-9b-it-q4f32_1-MLC",
        name: "gemma-2-9b-it-q4f32_1",
        size: "Unknown",
        description: "Model gemma-2-9b-it-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 gemma-2-9b-it-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "gemma-2-2b-jpn-it-q4f16_1-MLC",
        name: "gemma-2-2b-jpn-it-q4f16_1",
        size: "Unknown",
        description: "Model gemma-2-2b-jpn-it-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 gemma-2-2b-jpn-it-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "gemma-2-2b-jpn-it-q4f32_1-MLC",
        name: "gemma-2-2b-jpn-it-q4f32_1",
        size: "Unknown",
        description: "Model gemma-2-2b-jpn-it-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 gemma-2-2b-jpn-it-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Qwen3-0.6B-q4f16_1-MLC",
        name: "Qwen3-0.6B-q4f16_1",
        size: "Unknown",
        description: "Model Qwen3-0.6B-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen3-0.6B-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Qwen3-0.6B-q4f32_1-MLC",
        name: "Qwen3-0.6B-q4f32_1",
        size: "Unknown",
        description: "Model Qwen3-0.6B-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen3-0.6B-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Qwen3-0.6B-q0f16-MLC",
        name: "Qwen3-0.6B-q0f16",
        size: "Unknown",
        description: "Model Qwen3-0.6B-q0f16 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen3-0.6B-q0f16 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Qwen3-0.6B-q0f32-MLC",
        name: "Qwen3-0.6B-q0f32",
        size: "Unknown",
        description: "Model Qwen3-0.6B-q0f32 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen3-0.6B-q0f32 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Qwen3-1.7B-q4f16_1-MLC",
        name: "Qwen3-1.7B-q4f16_1",
        size: "~4GB",
        description: "Model Qwen3-1.7B-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen3-1.7B-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Qwen3-1.7B-q4f32_1-MLC",
        name: "Qwen3-1.7B-q4f32_1",
        size: "~4GB",
        description: "Model Qwen3-1.7B-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen3-1.7B-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Qwen3-4B-q4f16_1-MLC",
        name: "Qwen3-4B-q4f16_1",
        size: "Unknown",
        description: "Model Qwen3-4B-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen3-4B-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Qwen3-4B-q4f32_1-MLC",
        name: "Qwen3-4B-q4f32_1",
        size: "Unknown",
        description: "Model Qwen3-4B-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen3-4B-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Qwen3-8B-q4f16_1-MLC",
        name: "Qwen3-8B-q4f16_1",
        size: "~4GB",
        description: "Model Qwen3-8B-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen3-8B-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Qwen3-8B-q4f32_1-MLC",
        name: "Qwen3-8B-q4f32_1",
        size: "~4GB",
        description: "Model Qwen3-8B-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen3-8B-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
        name: "Qwen2.5-0.5B-Instruct-q4f16_1",
        size: "~350MB",
        description: "Model Qwen2.5-0.5B-Instruct-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen2.5-0.5B-Instruct-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 2048,
        recommended: false
    },
    {
        id: "Qwen2.5-0.5B-Instruct-q4f32_1-MLC",
        name: "Qwen2.5-0.5B-Instruct-q4f32_1",
        size: "~350MB",
        description: "Model Qwen2.5-0.5B-Instruct-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen2.5-0.5B-Instruct-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 2048,
        recommended: false
    },
    {
        id: "Qwen2.5-0.5B-Instruct-q0f16-MLC",
        name: "Qwen2.5-0.5B-Instruct-q0f16",
        size: "~350MB",
        description: "Model Qwen2.5-0.5B-Instruct-q0f16 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen2.5-0.5B-Instruct-q0f16 模型",
        quantization: "other",
        contextWindowSize: 2048,
        recommended: false
    },
    {
        id: "Qwen2.5-0.5B-Instruct-q0f32-MLC",
        name: "Qwen2.5-0.5B-Instruct-q0f32",
        size: "~350MB",
        description: "Model Qwen2.5-0.5B-Instruct-q0f32 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen2.5-0.5B-Instruct-q0f32 模型",
        quantization: "other",
        contextWindowSize: 2048,
        recommended: false
    },
    {
        id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
        name: "Qwen2.5-1.5B-Instruct-q4f16_1",
        size: "~900MB",
        description: "Model Qwen2.5-1.5B-Instruct-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen2.5-1.5B-Instruct-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Qwen2.5-1.5B-Instruct-q4f32_1-MLC",
        name: "Qwen2.5-1.5B-Instruct-q4f32_1",
        size: "~900MB",
        description: "Model Qwen2.5-1.5B-Instruct-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen2.5-1.5B-Instruct-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Qwen2.5-3B-Instruct-q4f16_1-MLC",
        name: "Qwen2.5-3B-Instruct-q4f16_1",
        size: "~1.8GB",
        description: "Model Qwen2.5-3B-Instruct-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen2.5-3B-Instruct-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Qwen2.5-3B-Instruct-q4f32_1-MLC",
        name: "Qwen2.5-3B-Instruct-q4f32_1",
        size: "~1.8GB",
        description: "Model Qwen2.5-3B-Instruct-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen2.5-3B-Instruct-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Qwen2.5-7B-Instruct-q4f16_1-MLC",
        name: "Qwen2.5-7B-Instruct-q4f16_1",
        size: "~4GB",
        description: "Model Qwen2.5-7B-Instruct-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen2.5-7B-Instruct-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Qwen2.5-7B-Instruct-q4f32_1-MLC",
        name: "Qwen2.5-7B-Instruct-q4f32_1",
        size: "~4GB",
        description: "Model Qwen2.5-7B-Instruct-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen2.5-7B-Instruct-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC",
        name: "Qwen2.5-Coder-0.5B-Instruct-q4f16_1",
        size: "~350MB",
        description: "Model Qwen2.5-Coder-0.5B-Instruct-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen2.5-Coder-0.5B-Instruct-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 2048,
        recommended: false
    },
    {
        id: "Qwen2.5-Coder-0.5B-Instruct-q4f32_1-MLC",
        name: "Qwen2.5-Coder-0.5B-Instruct-q4f32_1",
        size: "~350MB",
        description: "Model Qwen2.5-Coder-0.5B-Instruct-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen2.5-Coder-0.5B-Instruct-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 2048,
        recommended: false
    },
    {
        id: "Qwen2.5-Coder-0.5B-Instruct-q0f16-MLC",
        name: "Qwen2.5-Coder-0.5B-Instruct-q0f16",
        size: "~350MB",
        description: "Model Qwen2.5-Coder-0.5B-Instruct-q0f16 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen2.5-Coder-0.5B-Instruct-q0f16 模型",
        quantization: "other",
        contextWindowSize: 2048,
        recommended: false
    },
    {
        id: "Qwen2.5-Coder-0.5B-Instruct-q0f32-MLC",
        name: "Qwen2.5-Coder-0.5B-Instruct-q0f32",
        size: "~350MB",
        description: "Model Qwen2.5-Coder-0.5B-Instruct-q0f32 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen2.5-Coder-0.5B-Instruct-q0f32 模型",
        quantization: "other",
        contextWindowSize: 2048,
        recommended: false
    },
    {
        id: "Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC",
        name: "Qwen2.5-Coder-1.5B-Instruct-q4f16_1",
        size: "~900MB",
        description: "Model Qwen2.5-Coder-1.5B-Instruct-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen2.5-Coder-1.5B-Instruct-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Qwen2.5-Coder-1.5B-Instruct-q4f32_1-MLC",
        name: "Qwen2.5-Coder-1.5B-Instruct-q4f32_1",
        size: "~900MB",
        description: "Model Qwen2.5-Coder-1.5B-Instruct-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen2.5-Coder-1.5B-Instruct-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Qwen2.5-Coder-3B-Instruct-q4f16_1-MLC",
        name: "Qwen2.5-Coder-3B-Instruct-q4f16_1",
        size: "~1.8GB",
        description: "Model Qwen2.5-Coder-3B-Instruct-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen2.5-Coder-3B-Instruct-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Qwen2.5-Coder-3B-Instruct-q4f32_1-MLC",
        name: "Qwen2.5-Coder-3B-Instruct-q4f32_1",
        size: "~1.8GB",
        description: "Model Qwen2.5-Coder-3B-Instruct-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen2.5-Coder-3B-Instruct-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Qwen2.5-Coder-7B-Instruct-q4f16_1-MLC",
        name: "Qwen2.5-Coder-7B-Instruct-q4f16_1",
        size: "~4GB",
        description: "Model Qwen2.5-Coder-7B-Instruct-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen2.5-Coder-7B-Instruct-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Qwen2.5-Coder-7B-Instruct-q4f32_1-MLC",
        name: "Qwen2.5-Coder-7B-Instruct-q4f32_1",
        size: "~4GB",
        description: "Model Qwen2.5-Coder-7B-Instruct-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen2.5-Coder-7B-Instruct-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Qwen2.5-Math-1.5B-Instruct-q4f16_1-MLC",
        name: "Qwen2.5-Math-1.5B-Instruct-q4f16_1",
        size: "~900MB",
        description: "Model Qwen2.5-Math-1.5B-Instruct-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen2.5-Math-1.5B-Instruct-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Qwen2.5-Math-1.5B-Instruct-q4f32_1-MLC",
        name: "Qwen2.5-Math-1.5B-Instruct-q4f32_1",
        size: "~900MB",
        description: "Model Qwen2.5-Math-1.5B-Instruct-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen2.5-Math-1.5B-Instruct-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "stablelm-2-zephyr-1_6b-q4f16_1-MLC",
        name: "stablelm-2-zephyr-1_6b-q4f16_1",
        size: "Unknown",
        description: "Model stablelm-2-zephyr-1_6b-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 stablelm-2-zephyr-1_6b-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "stablelm-2-zephyr-1_6b-q4f32_1-MLC",
        name: "stablelm-2-zephyr-1_6b-q4f32_1",
        size: "Unknown",
        description: "Model stablelm-2-zephyr-1_6b-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 stablelm-2-zephyr-1_6b-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "stablelm-2-zephyr-1_6b-q4f16_1-MLC-1k",
        name: "stablelm-2-zephyr-1_6b-q4f16_1-1k",
        size: "Unknown",
        description: "Model stablelm-2-zephyr-1_6b-q4f16_1-1k provided by WebLLM",
        descriptionZh: "WebLLM 提供的 stablelm-2-zephyr-1_6b-q4f16_1-1k 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "stablelm-2-zephyr-1_6b-q4f32_1-MLC-1k",
        name: "stablelm-2-zephyr-1_6b-q4f32_1-1k",
        size: "Unknown",
        description: "Model stablelm-2-zephyr-1_6b-q4f32_1-1k provided by WebLLM",
        descriptionZh: "WebLLM 提供的 stablelm-2-zephyr-1_6b-q4f32_1-1k 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "RedPajama-INCITE-Chat-3B-v1-q4f16_1-MLC",
        name: "RedPajama-INCITE-Chat-3B-v1-q4f16_1",
        size: "~1.8GB",
        description: "Model RedPajama-INCITE-Chat-3B-v1-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 RedPajama-INCITE-Chat-3B-v1-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "RedPajama-INCITE-Chat-3B-v1-q4f32_1-MLC",
        name: "RedPajama-INCITE-Chat-3B-v1-q4f32_1",
        size: "~1.8GB",
        description: "Model RedPajama-INCITE-Chat-3B-v1-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 RedPajama-INCITE-Chat-3B-v1-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "RedPajama-INCITE-Chat-3B-v1-q4f16_1-MLC-1k",
        name: "RedPajama-INCITE-Chat-3B-v1-q4f16_1-1k",
        size: "~1.8GB",
        description: "Model RedPajama-INCITE-Chat-3B-v1-q4f16_1-1k provided by WebLLM",
        descriptionZh: "WebLLM 提供的 RedPajama-INCITE-Chat-3B-v1-q4f16_1-1k 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "RedPajama-INCITE-Chat-3B-v1-q4f32_1-MLC-1k",
        name: "RedPajama-INCITE-Chat-3B-v1-q4f32_1-1k",
        size: "~1.8GB",
        description: "Model RedPajama-INCITE-Chat-3B-v1-q4f32_1-1k provided by WebLLM",
        descriptionZh: "WebLLM 提供的 RedPajama-INCITE-Chat-3B-v1-q4f32_1-1k 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC",
        name: "TinyLlama-1.1B-Chat-v1.0-q4f16_1",
        size: "~900MB",
        description: "Model TinyLlama-1.1B-Chat-v1.0-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 TinyLlama-1.1B-Chat-v1.0-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 2048,
        recommended: false
    },
    {
        id: "TinyLlama-1.1B-Chat-v1.0-q4f32_1-MLC",
        name: "TinyLlama-1.1B-Chat-v1.0-q4f32_1",
        size: "~900MB",
        description: "Model TinyLlama-1.1B-Chat-v1.0-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 TinyLlama-1.1B-Chat-v1.0-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 2048,
        recommended: false
    },
    {
        id: "TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC-1k",
        name: "TinyLlama-1.1B-Chat-v1.0-q4f16_1-1k",
        size: "~900MB",
        description: "Model TinyLlama-1.1B-Chat-v1.0-q4f16_1-1k provided by WebLLM",
        descriptionZh: "WebLLM 提供的 TinyLlama-1.1B-Chat-v1.0-q4f16_1-1k 模型",
        quantization: "q4f16_1",
        contextWindowSize: 2048,
        recommended: false
    },
    {
        id: "TinyLlama-1.1B-Chat-v1.0-q4f32_1-MLC-1k",
        name: "TinyLlama-1.1B-Chat-v1.0-q4f32_1-1k",
        size: "~900MB",
        description: "Model TinyLlama-1.1B-Chat-v1.0-q4f32_1-1k provided by WebLLM",
        descriptionZh: "WebLLM 提供的 TinyLlama-1.1B-Chat-v1.0-q4f32_1-1k 模型",
        quantization: "other",
        contextWindowSize: 2048,
        recommended: false
    },
    {
        id: "Llama-3.1-70B-Instruct-q3f16_1-MLC",
        name: "Llama-3.1-70B-Instruct-q3f16_1",
        size: "Unknown",
        description: "Model Llama-3.1-70B-Instruct-q3f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Llama-3.1-70B-Instruct-q3f16_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Qwen2-0.5B-Instruct-q4f16_1-MLC",
        name: "Qwen2-0.5B-Instruct-q4f16_1",
        size: "~350MB",
        description: "Model Qwen2-0.5B-Instruct-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen2-0.5B-Instruct-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 2048,
        recommended: false
    },
    {
        id: "Qwen2-0.5B-Instruct-q0f16-MLC",
        name: "Qwen2-0.5B-Instruct-q0f16",
        size: "~350MB",
        description: "Model Qwen2-0.5B-Instruct-q0f16 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen2-0.5B-Instruct-q0f16 模型",
        quantization: "other",
        contextWindowSize: 2048,
        recommended: false
    },
    {
        id: "Qwen2-0.5B-Instruct-q0f32-MLC",
        name: "Qwen2-0.5B-Instruct-q0f32",
        size: "~350MB",
        description: "Model Qwen2-0.5B-Instruct-q0f32 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen2-0.5B-Instruct-q0f32 模型",
        quantization: "other",
        contextWindowSize: 2048,
        recommended: false
    },
    {
        id: "Qwen2-1.5B-Instruct-q4f16_1-MLC",
        name: "Qwen2-1.5B-Instruct-q4f16_1",
        size: "~900MB",
        description: "Model Qwen2-1.5B-Instruct-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen2-1.5B-Instruct-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Qwen2-1.5B-Instruct-q4f32_1-MLC",
        name: "Qwen2-1.5B-Instruct-q4f32_1",
        size: "~900MB",
        description: "Model Qwen2-1.5B-Instruct-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen2-1.5B-Instruct-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Qwen2-7B-Instruct-q4f16_1-MLC",
        name: "Qwen2-7B-Instruct-q4f16_1",
        size: "~4GB",
        description: "Model Qwen2-7B-Instruct-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen2-7B-Instruct-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Qwen2-7B-Instruct-q4f32_1-MLC",
        name: "Qwen2-7B-Instruct-q4f32_1",
        size: "~4GB",
        description: "Model Qwen2-7B-Instruct-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen2-7B-Instruct-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Qwen2-Math-1.5B-Instruct-q4f16_1-MLC",
        name: "Qwen2-Math-1.5B-Instruct-q4f16_1",
        size: "~900MB",
        description: "Model Qwen2-Math-1.5B-Instruct-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen2-Math-1.5B-Instruct-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Qwen2-Math-1.5B-Instruct-q4f32_1-MLC",
        name: "Qwen2-Math-1.5B-Instruct-q4f32_1",
        size: "~900MB",
        description: "Model Qwen2-Math-1.5B-Instruct-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen2-Math-1.5B-Instruct-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Qwen2-Math-7B-Instruct-q4f16_1-MLC",
        name: "Qwen2-Math-7B-Instruct-q4f16_1",
        size: "~4GB",
        description: "Model Qwen2-Math-7B-Instruct-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen2-Math-7B-Instruct-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Qwen2-Math-7B-Instruct-q4f32_1-MLC",
        name: "Qwen2-Math-7B-Instruct-q4f32_1",
        size: "~4GB",
        description: "Model Qwen2-Math-7B-Instruct-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Qwen2-Math-7B-Instruct-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Llama-3-8B-Instruct-q4f32_1-MLC-1k",
        name: "Llama-3-8B-Instruct-q4f32_1-1k",
        size: "~4GB",
        description: "Model Llama-3-8B-Instruct-q4f32_1-1k provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Llama-3-8B-Instruct-q4f32_1-1k 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Llama-3-8B-Instruct-q4f16_1-MLC-1k",
        name: "Llama-3-8B-Instruct-q4f16_1-1k",
        size: "~4GB",
        description: "Model Llama-3-8B-Instruct-q4f16_1-1k provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Llama-3-8B-Instruct-q4f16_1-1k 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Llama-3-8B-Instruct-q4f32_1-MLC",
        name: "Llama-3-8B-Instruct-q4f32_1",
        size: "~4GB",
        description: "Model Llama-3-8B-Instruct-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Llama-3-8B-Instruct-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Llama-3-8B-Instruct-q4f16_1-MLC",
        name: "Llama-3-8B-Instruct-q4f16_1",
        size: "~4GB",
        description: "Model Llama-3-8B-Instruct-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Llama-3-8B-Instruct-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Llama-3-70B-Instruct-q3f16_1-MLC",
        name: "Llama-3-70B-Instruct-q3f16_1",
        size: "Unknown",
        description: "Model Llama-3-70B-Instruct-q3f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Llama-3-70B-Instruct-q3f16_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Phi-3-mini-4k-instruct-q4f16_1-MLC",
        name: "Phi-3-mini-4k-instruct-q4f16_1",
        size: "Unknown",
        description: "Model Phi-3-mini-4k-instruct-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Phi-3-mini-4k-instruct-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Phi-3-mini-4k-instruct-q4f32_1-MLC",
        name: "Phi-3-mini-4k-instruct-q4f32_1",
        size: "Unknown",
        description: "Model Phi-3-mini-4k-instruct-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Phi-3-mini-4k-instruct-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Phi-3-mini-4k-instruct-q4f16_1-MLC-1k",
        name: "Phi-3-mini-4k-instruct-q4f16_1-1k",
        size: "Unknown",
        description: "Model Phi-3-mini-4k-instruct-q4f16_1-1k provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Phi-3-mini-4k-instruct-q4f16_1-1k 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Phi-3-mini-4k-instruct-q4f32_1-MLC-1k",
        name: "Phi-3-mini-4k-instruct-q4f32_1-1k",
        size: "Unknown",
        description: "Model Phi-3-mini-4k-instruct-q4f32_1-1k provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Phi-3-mini-4k-instruct-q4f32_1-1k 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Llama-2-7b-chat-hf-q4f32_1-MLC-1k",
        name: "Llama-2-7b-chat-hf-q4f32_1-1k",
        size: "Unknown",
        description: "Model Llama-2-7b-chat-hf-q4f32_1-1k provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Llama-2-7b-chat-hf-q4f32_1-1k 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Llama-2-7b-chat-hf-q4f16_1-MLC-1k",
        name: "Llama-2-7b-chat-hf-q4f16_1-1k",
        size: "Unknown",
        description: "Model Llama-2-7b-chat-hf-q4f16_1-1k provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Llama-2-7b-chat-hf-q4f16_1-1k 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Llama-2-7b-chat-hf-q4f32_1-MLC",
        name: "Llama-2-7b-chat-hf-q4f32_1",
        size: "Unknown",
        description: "Model Llama-2-7b-chat-hf-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Llama-2-7b-chat-hf-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Llama-2-7b-chat-hf-q4f16_1-MLC",
        name: "Llama-2-7b-chat-hf-q4f16_1",
        size: "Unknown",
        description: "Model Llama-2-7b-chat-hf-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Llama-2-7b-chat-hf-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Llama-2-13b-chat-hf-q4f16_1-MLC",
        name: "Llama-2-13b-chat-hf-q4f16_1",
        size: "Unknown",
        description: "Model Llama-2-13b-chat-hf-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Llama-2-13b-chat-hf-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "gemma-2b-it-q4f16_1-MLC",
        name: "gemma-2b-it-q4f16_1",
        size: "Unknown",
        description: "Model gemma-2b-it-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 gemma-2b-it-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "gemma-2b-it-q4f32_1-MLC",
        name: "gemma-2b-it-q4f32_1",
        size: "Unknown",
        description: "Model gemma-2b-it-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 gemma-2b-it-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "gemma-2b-it-q4f16_1-MLC-1k",
        name: "gemma-2b-it-q4f16_1-1k",
        size: "Unknown",
        description: "Model gemma-2b-it-q4f16_1-1k provided by WebLLM",
        descriptionZh: "WebLLM 提供的 gemma-2b-it-q4f16_1-1k 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "gemma-2b-it-q4f32_1-MLC-1k",
        name: "gemma-2b-it-q4f32_1-1k",
        size: "Unknown",
        description: "Model gemma-2b-it-q4f32_1-1k provided by WebLLM",
        descriptionZh: "WebLLM 提供的 gemma-2b-it-q4f32_1-1k 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "phi-2-q4f16_1-MLC",
        name: "phi-2-q4f16_1",
        size: "Unknown",
        description: "Model phi-2-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 phi-2-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "phi-2-q4f32_1-MLC",
        name: "phi-2-q4f32_1",
        size: "Unknown",
        description: "Model phi-2-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 phi-2-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "phi-2-q4f16_1-MLC-1k",
        name: "phi-2-q4f16_1-1k",
        size: "Unknown",
        description: "Model phi-2-q4f16_1-1k provided by WebLLM",
        descriptionZh: "WebLLM 提供的 phi-2-q4f16_1-1k 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "phi-2-q4f32_1-MLC-1k",
        name: "phi-2-q4f32_1-1k",
        size: "Unknown",
        description: "Model phi-2-q4f32_1-1k provided by WebLLM",
        descriptionZh: "WebLLM 提供的 phi-2-q4f32_1-1k 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "phi-1_5-q4f16_1-MLC",
        name: "phi-1_5-q4f16_1",
        size: "Unknown",
        description: "Model phi-1_5-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 phi-1_5-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "phi-1_5-q4f32_1-MLC",
        name: "phi-1_5-q4f32_1",
        size: "Unknown",
        description: "Model phi-1_5-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 phi-1_5-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "phi-1_5-q4f16_1-MLC-1k",
        name: "phi-1_5-q4f16_1-1k",
        size: "Unknown",
        description: "Model phi-1_5-q4f16_1-1k provided by WebLLM",
        descriptionZh: "WebLLM 提供的 phi-1_5-q4f16_1-1k 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "phi-1_5-q4f32_1-MLC-1k",
        name: "phi-1_5-q4f32_1-1k",
        size: "Unknown",
        description: "Model phi-1_5-q4f32_1-1k provided by WebLLM",
        descriptionZh: "WebLLM 提供的 phi-1_5-q4f32_1-1k 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "TinyLlama-1.1B-Chat-v0.4-q4f16_1-MLC",
        name: "TinyLlama-1.1B-Chat-v0.4-q4f16_1",
        size: "~900MB",
        description: "Model TinyLlama-1.1B-Chat-v0.4-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 TinyLlama-1.1B-Chat-v0.4-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 2048,
        recommended: false
    },
    {
        id: "TinyLlama-1.1B-Chat-v0.4-q4f32_1-MLC",
        name: "TinyLlama-1.1B-Chat-v0.4-q4f32_1",
        size: "~900MB",
        description: "Model TinyLlama-1.1B-Chat-v0.4-q4f32_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 TinyLlama-1.1B-Chat-v0.4-q4f32_1 模型",
        quantization: "other",
        contextWindowSize: 2048,
        recommended: false
    },
    {
        id: "TinyLlama-1.1B-Chat-v0.4-q4f16_1-MLC-1k",
        name: "TinyLlama-1.1B-Chat-v0.4-q4f16_1-1k",
        size: "~900MB",
        description: "Model TinyLlama-1.1B-Chat-v0.4-q4f16_1-1k provided by WebLLM",
        descriptionZh: "WebLLM 提供的 TinyLlama-1.1B-Chat-v0.4-q4f16_1-1k 模型",
        quantization: "q4f16_1",
        contextWindowSize: 2048,
        recommended: false
    },
    {
        id: "TinyLlama-1.1B-Chat-v0.4-q4f32_1-MLC-1k",
        name: "TinyLlama-1.1B-Chat-v0.4-q4f32_1-1k",
        size: "~900MB",
        description: "Model TinyLlama-1.1B-Chat-v0.4-q4f32_1-1k provided by WebLLM",
        descriptionZh: "WebLLM 提供的 TinyLlama-1.1B-Chat-v0.4-q4f32_1-1k 模型",
        quantization: "other",
        contextWindowSize: 2048,
        recommended: false
    },
    {
        id: "snowflake-arctic-embed-m-q0f32-MLC-b32",
        name: "snowflake-arctic-embed-m-q0f32-b32",
        size: "Unknown",
        description: "Model snowflake-arctic-embed-m-q0f32-b32 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 snowflake-arctic-embed-m-q0f32-b32 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "snowflake-arctic-embed-m-q0f32-MLC-b4",
        name: "snowflake-arctic-embed-m-q0f32-b4",
        size: "Unknown",
        description: "Model snowflake-arctic-embed-m-q0f32-b4 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 snowflake-arctic-embed-m-q0f32-b4 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "snowflake-arctic-embed-s-q0f32-MLC-b32",
        name: "snowflake-arctic-embed-s-q0f32-b32",
        size: "Unknown",
        description: "Model snowflake-arctic-embed-s-q0f32-b32 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 snowflake-arctic-embed-s-q0f32-b32 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "snowflake-arctic-embed-s-q0f32-MLC-b4",
        name: "snowflake-arctic-embed-s-q0f32-b4",
        size: "Unknown",
        description: "Model snowflake-arctic-embed-s-q0f32-b4 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 snowflake-arctic-embed-s-q0f32-b4 模型",
        quantization: "other",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Ministral-3-3B-Base-2512-q4f16_1-MLC",
        name: "Ministral-3-3B-Base-2512-q4f16_1",
        size: "~1.8GB",
        description: "Model Ministral-3-3B-Base-2512-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Ministral-3-3B-Base-2512-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Ministral-3-3B-Reasoning-2512-q4f16_1-MLC",
        name: "Ministral-3-3B-Reasoning-2512-q4f16_1",
        size: "~1.8GB",
        description: "Model Ministral-3-3B-Reasoning-2512-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Ministral-3-3B-Reasoning-2512-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    },
    {
        id: "Ministral-3-3B-Instruct-2512-BF16-q4f16_1-MLC",
        name: "Ministral-3-3B-Instruct-2512-BF16-q4f16_1",
        size: "~1.8GB",
        description: "Model Ministral-3-3B-Instruct-2512-BF16-q4f16_1 provided by WebLLM",
        descriptionZh: "WebLLM 提供的 Ministral-3-3B-Instruct-2512-BF16-q4f16_1 模型",
        quantization: "q4f16_1",
        contextWindowSize: 4096,
        recommended: false
    }
];

/**
 * 获取默认推荐模型
 */
export function getDefaultWebLLMModel(): WebLLMModelInfo {
    return WEBLLM_MODELS.find(m => m.recommended) || WEBLLM_MODELS[0];
}

/**
 * 通过 ID 查找模型信息
 */
export function getWebLLMModelById(id: string): WebLLMModelInfo | undefined {
    return WEBLLM_MODELS.find(m => m.id === id);
}
