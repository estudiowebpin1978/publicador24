import type { AIProvider } from './types';
import { MockAIProvider } from './mock-provider';
import { OpenAIProvider } from './openai-provider';

let cachedProvider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (cachedProvider) return cachedProvider;

  const hasApiKey = !!process.env.AI_API_KEY;

  if (hasApiKey) {
    cachedProvider = new OpenAIProvider();
  } else {
    cachedProvider = new MockAIProvider();
  }

  return cachedProvider;
}

export function resetAIProvider(): void {
  cachedProvider = null;
}
