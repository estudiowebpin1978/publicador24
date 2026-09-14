import type { AIProvider, AITextInput, AITextResult, AIAnalysisInput, AIAnalysisResult, HashtagInput, HashtagResult, TrendInput, TrendResult, VariantInput, VariantResult, ScoreInput, ScoreResult } from './types';

// Pricing per 1M tokens (estimated)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'google/gemini-2.0-flash-001': { input: 0.10, output: 0.40 },
  'google/gemini-2.0-flash': { input: 0.10, output: 0.40 },
  'llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
  'llama-3.1-8b-instant': { input: 0.05, output: 0.08 },
  'gemma2-9b-it': { input: 0.20, output: 0.20 },
};

interface CostLogEntry {
  provider: string;
  model: string;
  operation: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  campaignId?: string;
  durationMs: number;
  timestamp: number;
}

const costLog: CostLogEntry[] = [];

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

export function logCost(entry: CostLogEntry): void {
  costLog.push(entry);
  const today = new Date().toISOString().split('T')[0];
  console.log(
    `[COST] ${today} | ${entry.provider}/${entry.model} | ` +
    `${entry.operation} | in:${entry.inputTokens} out:${entry.outputTokens} | ` +
    `$${entry.costUsd.toFixed(6)} | ${entry.durationMs}ms`
  );
}

export function getCostLog(): CostLogEntry[] {
  return [...costLog];
}

export function getTodayCost(): { totalCost: number; totalTokens: number; count: number } {
  const today = new Date().toISOString().split('T')[0];
  const todayEntries = costLog.filter(e => new Date(e.timestamp).toISOString().split('T')[0] === today);
  return {
    totalCost: todayEntries.reduce((s, e) => s + e.costUsd, 0),
    totalTokens: todayEntries.reduce((s, e) => s + e.inputTokens + e.outputTokens, 0),
    count: todayEntries.length,
  };
}

export function wrapProviderWithCostTracking(
  provider: AIProvider,
  providerName: string,
  campaignId?: string
): AIProvider {
  const originalGenerateText = provider.generateText.bind(provider);

  return {
    ...provider,
    async generateText(input: AITextInput): Promise<AITextResult> {
      const start = Date.now();
      const result = await originalGenerateText(input);
      const durationMs = Date.now() - start;

      const inputEstimate = Math.ceil((input.prompt?.length || 0) / 4);
      const outputEstimate = result.tokens_used || Math.ceil((result.text?.length || 0) / 4);
      const model = result.model || 'unknown';
      const costUsd = estimateCost(model, inputEstimate, outputEstimate);

      logCost({
        provider: providerName,
        model,
        operation: 'generateText',
        inputTokens: inputEstimate,
        outputTokens: outputEstimate,
        costUsd,
        campaignId,
        durationMs,
        timestamp: Date.now(),
      });

      return result;
    },
  } as AIProvider;
}
