/**
 * Web Worker handler for WebLLM inference
 * This runs in a separate thread to avoid blocking the main UI
 */
import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm';

let handler: WebWorkerMLCEngineHandler;

self.onmessage = (msg: MessageEvent) => {
  if (!handler) {
    handler = new WebWorkerMLCEngineHandler();
    console.log('[Worker] WebLLM Engine initialized');
  }
  handler.onmessage(msg);
};
