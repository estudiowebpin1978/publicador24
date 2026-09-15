import type { AIProvider } from './types';
import { MockAIProvider } from './mock-provider';
import { OpenRouterProvider } from './openrouter-provider';
import { GroqProvider } from './groq-provider';
import { HuggingFaceProvider } from './huggingface-provider';

let cachedProvider: AIProvider | null = null;

const isProd = process.env.NODE_ENV === 'production';

export function getAIProvider(): AIProvider {
  if (cachedProvider) return cachedProvider;

  const provider = process.env.AI_PROVIDER || 'openrouter';

  switch (provider) {
    case 'openrouter':
      if (process.env.OPENROUTER_API_KEY) {
        cachedProvider = new OpenRouterProvider();
        return cachedProvider;
      }
      if (isProd) {
        throw new Error(
          'AI PROVIDER NOT CONFIGURED: OPENROUTER_API_KEY is missing. ' +
          'Set OPENROUTER_API_KEY in .env.local to enable real AI generation.'
        );
      }
      break;
    case 'groq':
      if (process.env.GROQ_API_KEY) {
        cachedProvider = new GroqProvider();
        return cachedProvider;
      }
      break;
    case 'huggingface':
      if (process.env.HF_API_KEY) {
        cachedProvider = new HuggingFaceProvider();
        return cachedProvider;
      }
      if (isProd) {
        throw new Error(
          'AI PROVIDER NOT CONFIGURED: HF_API_KEY is missing. '
        );
      }
      break;
      if (isProd) {
        throw new Error(
          'AI PROVIDER NOT CONFIGURED: GROQ_API_KEY is missing. ' +
          'Set GROQ_API_KEY in .env.local to enable real AI generation.'
        );
      }
      break;
    default:
      break;
  }

  if (isProd) {
    throw new Error(
      `AI PROVIDER NOT CONFIGURED: Unknown provider "${provider}". ` +
      'Set AI_PROVIDER to "openrouter" or "groq" and provide the corresponding API key.'
    );
  }

  console.warn('[DEV] Using MockAIProvider — no real AI configured');
  cachedProvider = new MockAIProvider();
  return cachedProvider;
}

export function resetAIProvider(): void {
  cachedProvider = null;
}

