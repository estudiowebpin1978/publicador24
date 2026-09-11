import type { SocialPlatform } from '@/types';
import type { LearningMemory, AdaptiveWeights, HookType } from '@/lib/ai/engines';

const MEMORY_KEY = 'learning_memory';
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

function getEmptyMemory(): LearningMemory {
  return {
    successfulHooks: [],
    successfulTopics: [],
    successfulHashtags: [],
    successfulTimes: [],
    successfulFormats: [],
  };
}

export function loadLearningMemory(): LearningMemory {
  if (typeof window === 'undefined') return getEmptyMemory();
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    if (!raw) return getEmptyMemory();
    return JSON.parse(raw) as LearningMemory;
  } catch {
    return getEmptyMemory();
  }
}

export function saveLearningMemory(memory: LearningMemory): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
}

export function loadAdaptiveWeights(): AdaptiveWeights {
  if (typeof window === 'undefined') return DEFAULT_WEIGHTS;
  try {
    const raw = localStorage.getItem(WEIGHTS_KEY);
    if (!raw) return DEFAULT_WEIGHTS;
    return JSON.parse(raw) as AdaptiveWeights;
  } catch {
    return DEFAULT_WEIGHTS;
  }
}

export function saveAdaptiveWeights(weights: AdaptiveWeights): void {
  if (typeof window === 'undefined') return;
  weights.lastUpdated = new Date().toISOString();
  localStorage.setItem(WEIGHTS_KEY, JSON.stringify(weights));
}

export function recordSuccessfulHook(text: string, type: HookType, score: number): void {
  const memory = loadLearningMemory();
  memory.successfulHooks.push({ text, type, score });
  if (memory.successfulHooks.length > 200) {
    memory.successfulHooks = memory.successfulHooks.slice(-200);
  }
  saveLearningMemory(memory);
}

export function recordSuccessfulTopic(topic: string, score: number): void {
  const memory = loadLearningMemory();
  memory.successfulTopics.push({ topic, score });
  if (memory.successfulTopics.length > 100) {
    memory.successfulTopics = memory.successfulTopics.slice(-100);
  }
  saveLearningMemory(memory);
}

export function recordSuccessfulHashtag(tag: string, platform: SocialPlatform, score: number): void {
  const memory = loadLearningMemory();
  memory.successfulHashtags.push({ tag, platform, score });
  if (memory.successfulHashtags.length > 300) {
    memory.successfulHashtags = memory.successfulHashtags.slice(-300);
  }
  saveLearningMemory(memory);
}

export function recordSuccessfulTime(day: number, hour: number, platform: SocialPlatform, score: number): void {
  const memory = loadLearningMemory();
  memory.successfulTimes.push({ day, hour, platform, score });
  if (memory.successfulTimes.length > 500) {
    memory.successfulTimes = memory.successfulTimes.slice(-500);
  }
  saveLearningMemory(memory);
}

export function recordSuccessfulFormat(format: string, platform: SocialPlatform, score: number): void {
  const memory = loadLearningMemory();
  memory.successfulFormats.push({ format, platform, score });
  if (memory.successfulFormats.length > 200) {
    memory.successfulFormats = memory.successfulFormats.slice(-200);
  }
  saveLearningMemory(memory);
}

export function recalculateWeights(): AdaptiveWeights {
  const memory = loadLearningMemory();
  const weights = loadAdaptiveWeights();

  const hookTypeScores: Record<HookType, number[]> = {
    curiosity: [], question: [], contrarian: [], benefit: [], fear: [],
    story: [], surprise: [], problem: [], solution: [], list: [],
  };

  for (const hook of memory.successfulHooks) {
    hookTypeScores[hook.type]?.push(hook.score);
  }

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 1.0;
  const normalize = (val: number, max: number) => max > 0 ? val / max : 1.0;

  let maxAvg = 0;
  for (const type of Object.keys(hookTypeScores) as HookType[]) {
    const typeAvg = avg(hookTypeScores[type]);
    if (typeAvg > maxAvg) maxAvg = typeAvg;
  }

  for (const type of Object.keys(hookTypeScores) as HookType[]) {
    weights.hookWeights[type] = normalize(avg(hookTypeScores[type]), maxAvg || 1);
  }

  const hashtagScores = memory.successfulHashtags.map((h) => h.score);
  const topicScores = memory.successfulTopics.map((t) => t.score);
  const timeScores = memory.successfulTimes.map((t) => t.score);
  const formatScores = memory.successfulFormats.map((f) => f.score);

  weights.hashtagWeight = normalize(avg(hashtagScores), 100);
  weights.topicWeight = normalize(avg(topicScores), 100);
  weights.timeWeight = normalize(avg(timeScores), 100);
  weights.formatWeight = normalize(avg(formatScores), 100);

  saveAdaptiveWeights(weights);
  return weights;
}

export function getBestHooksByType(type: HookType, limit = 5): LearningMemory['successfulHooks'] {
  const memory = loadLearningMemory();
  return memory.successfulHooks
    .filter((h) => h.type === type)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function getBestTimesForPlatform(platform: SocialPlatform, limit = 5): LearningMemory['successfulTimes'] {
  const memory = loadLearningMemory();
  return memory.successfulTimes
    .filter((t) => t.platform === platform)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function clearLearningMemory(): void {
  saveLearningMemory(getEmptyMemory());
  saveAdaptiveWeights(DEFAULT_WEIGHTS);
}
