import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

// Handler instance for MLCEngine in the worker
const handler = new WebWorkerMLCEngineHandler();

// Listen for messages from the main thread
self.onmessage = (event: MessageEvent) => {
	try {
		handler.onmessage(event);
	} catch (error) {
		// Send error back to main thread
		self.postMessage({ type: "error", error: error instanceof Error ? error.message : String(error) });
	}
};