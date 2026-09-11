import type { AdaptiveWeights, HookType } from '@/lib/ai/engines';

const WEIGHTS_KEY = 'adaptive_weights';

const DEFAULT_WEIGHTS: AdaptiveWeights = {
  hookWeights: {
    curiosity: 1.0,
    question: 1.0,
    contrarian: 1.0,
    benefit: 1.0,
    fear: 1.0,
    story: 1.0,
    surprise: 1.0,
    problem: 1.0,
    solution: 1.0,
    list: 1.0,
  },
  hashtagWeight: 1.0,
  topicWeight: 1.0,
  timeWeight: 1.0,
  formatWeight: 1.0,
  lastUpdated: new Date().toISOString(),
};

export function loadWeights(): AdaptiveWeights {
  if (typeof window === 'undefined') return DEFAULT_WEIGHTS;
  try {
    const raw = localStorage.getItem(WEIGHTS_KEY);
    if (!raw) return DEFAULT_WEIGHTS;
    return JSON.parse(raw) as AdaptiveWeights;
  } catch {
    return DEFAULT_WEIGHTS;
  }
}

export function saveWeights(weights: AdaptiveWeights): void {
  if (typeof window === 'undefined') return;
  weights.lastUpdated = new Date().toISOString();
  localStorage.setItem(WEIGHTS_KEY, JSON.stringify(weights));
}

export function getHookWeight(type: HookType): number {
  const weights = loadWeights();
  return weights.hookWeights[type] || 1.0;
}

export function getHashtagWeight(): number {
  return loadWeights().hashtagWeight;
}

export function getTopicWeight(): number {
  return loadWeights().topicWeight;
}

export function getTimeWeight(): number {
  return loadWeights().timeWeight;
}

export function getFormatWeight(): number {
  return loadWeights().formatWeight;
}

export function adjustHookWeight(type: HookType, delta: number): void {
  const weights = loadWeights();
  const current = weights.hookWeights[type] || 1.0;
  weights.hookWeights[type] = Math.max(0.1, Math.min(2.0, current + delta));
  saveWeights(weights);
}

export function adjustHashtagWeight(delta: number): void {
  const weights = loadWeights();
  weights.hashtagWeight = Math.max(0.1, Math.min(2.0, weights.hashtagWeight + delta));
  saveWeights(weights);
}

export function adjustTopicWeight(delta: number): void {
  const weights = loadWeights();
  weights.topicWeight = Math.max(0.1, Math.min(2.0, weights.topicWeight + delta));
  saveWeights(weights);
}

export function adjustTimeWeight(delta: number): void {
  const weights = loadWeights();
  weights.timeWeight = Math.max(0.1, Math.min(2.0, weights.timeWeight + delta));
  saveWeights(weights);
}

export function adjustFormatWeight(delta: number): void {
  const weights = loadWeights();
  weights.formatWeight = Math.max(0.1, Math.min(2.0, weights.formatWeight + delta));
  saveWeights(weights);
}

export function resetWeights(): void {
  saveWeights(DEFAULT_WEIGHTS);
}

export function getWeightsSummary(): Record<string, number> {
  const w = loadWeights();
  return {
    ...Object.fromEntries(Object.entries(w.hookWeights).map(([k, v]) => [`hook_${k}`, v])),
    hashtag: w.hashtagWeight,
    topic: w.topicWeight,
    time: w.timeWeight,
    format: w.formatWeight,
  };
}
