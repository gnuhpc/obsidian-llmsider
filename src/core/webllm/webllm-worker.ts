/**
 * WebLLM Web Worker
 * 
 * This worker runs the MLC inference engine in a separate thread
 * to avoid blocking the main Obsidian UI thread.
 * 
 * It uses the WebWorkerMLCEngineHandler from @mlc-ai/web-llm
 * to handle messages from the main thread.
 */

import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

const handler = new WebWorkerMLCEngineHandler();

self.onmessage = (msg: MessageEvent) => {
    handler.onmessage(msg);
};
