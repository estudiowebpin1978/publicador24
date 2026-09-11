import type { SocialPlatform } from '@/types';
import type { BrandMemory } from '@/lib/ai/engines';

const STORAGE_KEY = 'brand_memory';

function getEmptyMemory(): BrandMemory {
  return {
    successfulHooks: [],
    successfulCaptions: [],
    successfulHashtags: [],
    successfulTopics: [],
    successfulFormats: [],
    lastUpdated: new Date().toISOString(),
  };
}

export function loadBrandMemory(): BrandMemory {
  if (typeof window === 'undefined') return getEmptyMemory();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getEmptyMemory();
    return JSON.parse(raw) as BrandMemory;
  } catch {
    return getEmptyMemory();
  }
}

export function saveBrandMemory(memory: BrandMemory): void {
  if (typeof window === 'undefined') return;
  memory.lastUpdated = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
}

export function recordSuccessfulHook(
  text: string,
  engagement: number,
  platform: SocialPlatform
): void {
  const memory = loadBrandMemory();
  memory.successfulHooks.push({ text, engagement, platform });
  if (memory.successfulHooks.length > 100) {
    memory.successfulHooks = memory.successfulHooks.slice(-100);
  }
  saveBrandMemory(memory);
}

export function recordSuccessfulCaption(
  text: string,
  engagement: number,
  platform: SocialPlatform
): void {
  const memory = loadBrandMemory();
  memory.successfulCaptions.push({ text, engagement, platform });
  if (memory.successfulCaptions.length > 100) {
    memory.successfulCaptions = memory.successfulCaptions.slice(-100);
  }
  saveBrandMemory(memory);
}

export function recordSuccessfulHashtag(
  tag: string,
  engagement: number,
  platform: SocialPlatform
): void {
  const memory = loadBrandMemory();
  const existing = memory.successfulHashtags.find(
    (h) => h.tag === tag && h.platform === platform
  );
  if (existing) {
    existing.engagement = (existing.engagement + engagement) / 2;
  } else {
    memory.successfulHashtags.push({ tag, engagement, platform });
  }
  if (memory.successfulHashtags.length > 200) {
    memory.successfulHashtags = memory.successfulHashtags.slice(-200);
  }
  saveBrandMemory(memory);
}

export function recordSuccessfulTopic(topic: string, engagement: number): void {
  const memory = loadBrandMemory();
  const existing = memory.successfulTopics.find((t) => t.topic === topic);
  if (existing) {
    existing.engagement = (existing.engagement + engagement) / 2;
  } else {
    memory.successfulTopics.push({ topic, engagement });
  }
  if (memory.successfulTopics.length > 50) {
    memory.successfulTopics = memory.successfulTopics.slice(-50);
  }
  saveBrandMemory(memory);
}

export function recordSuccessfulFormat(
  format: string,
  engagement: number,
  platform: SocialPlatform
): void {
  const memory = loadBrandMemory();
  memory.successfulFormats.push({ format, engagement, platform });
  if (memory.successfulFormats.length > 100) {
    memory.successfulFormats = memory.successfulFormats.slice(-100);
  }
  saveBrandMemory(memory);
}

export function getTopHooks(platform?: SocialPlatform, limit = 10): BrandMemory['successfulHooks'] {
  const memory = loadBrandMemory();
  let hooks = memory.successfulHooks;
  if (platform) {
    hooks = hooks.filter((h) => h.platform === platform);
  }
  return hooks.sort((a, b) => b.engagement - a.engagement).slice(0, limit);
}

export function getTopHashtags(platform?: SocialPlatform, limit = 20): BrandMemory['successfulHashtags'] {
  const memory = loadBrandMemory();
  let tags = memory.successfulHashtags;
  if (platform) {
    tags = tags.filter((t) => t.platform === platform);
  }
  return tags.sort((a, b) => b.engagement - a.engagement).slice(0, limit);
}

export function getTopTopics(limit = 10): BrandMemory['successfulTopics'] {
  const memory = loadBrandMemory();
  return memory.successfulTopics.sort((a, b) => b.engagement - a.engagement).slice(0, limit);
}

export function clearBrandMemory(): void {
  saveBrandMemory(getEmptyMemory());
}
