import type { AIProvider } from './types';
import { MockAIProvider } from './mock-provider';
import { OpenRouterProvider } from './openrouter-provider';
import { GroqProvider } from './groq-provider';

let cachedProvider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (cachedProvider) return cachedProvider;

  const provider = process.env.AI_PROVIDER || 'openrouter';

  switch (provider) {
    case 'openrouter':
      if (process.env.OPENROUTER_API_KEY) {
        cachedProvider = new OpenRouterProvider();
        return cachedProvider;
      }
      break;
    case 'groq':
      if (process.env.GROQ_API_KEY) {
        cachedProvider = new GroqProvider();
        return cachedProvider;
      }
      break;
    default:
      break;
  }

  cachedProvider = new MockAIProvider();
  return cachedProvider;
}

export function resetAIProvider(): void {
  cachedProvider = null;
}
