import { providerRegistry } from "../index";
import { nvidiaAdapter } from "./nvidia";
import { openaiAdapter } from "./openai";
import { anthropicAdapter } from "./anthropic";
import { googleAdapter } from "./google";
import { ollamaAdapter } from "./ollama";
import { openrouterAdapter } from "./openrouter";
import { openaiCompatibleAdapter } from "./openai-compatible";

export function registerBuiltinAdapters(): void {
  providerRegistry.registerAdapter(nvidiaAdapter);
  providerRegistry.registerAdapter(openaiAdapter);
  providerRegistry.registerAdapter(anthropicAdapter);
  providerRegistry.registerAdapter(googleAdapter);
  providerRegistry.registerAdapter(ollamaAdapter);
  providerRegistry.registerAdapter(openrouterAdapter);
  providerRegistry.registerAdapter(openaiCompatibleAdapter);
}

export * from "./nvidia";
export * from "./openai";
export * from "./anthropic";
export * from "./google";
export * from "./ollama";
export * from "./openrouter";
export * from "./openai-compatible";