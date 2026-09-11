import type { ContentMemory } from '@/lib/ai/engines';

const STORAGE_KEY = 'content_memory';

function getEmptyMemory(): ContentMemory {
  return {
    topicsUsed: [],
    hooksUsed: [],
    hashtagsUsed: [],
    formatsUsed: [],
  };
}

export function loadContentMemory(): ContentMemory {
  if (typeof window === 'undefined') return getEmptyMemory();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getEmptyMemory();
    return JSON.parse(raw) as ContentMemory;
  } catch {
    return getEmptyMemory();
  }
}

export function saveContentMemory(memory: ContentMemory): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
}

export function recordTopicUsed(topic: string): void {
  const memory = loadContentMemory();
  const existing = memory.topicsUsed.find((t) => t.topic === topic);
  if (existing) {
    existing.count++;
    existing.lastUsed = new Date().toISOString();
  } else {
    memory.topicsUsed.push({ topic, count: 1, lastUsed: new Date().toISOString() });
  }
  saveContentMemory(memory);
}

export function recordHookUsed(hook: string): void {
  const memory = loadContentMemory();
  const existing = memory.hooksUsed.find((h) => h.hook === hook);
  if (existing) {
    existing.count++;
    existing.lastUsed = new Date().toISOString();
  } else {
    memory.hooksUsed.push({ hook, count: 1, lastUsed: new Date().toISOString() });
  }
  saveContentMemory(memory);
}

export function recordHashtagUsed(tag: string): void {
  const memory = loadContentMemory();
  const existing = memory.hashtagsUsed.find((h) => h.tag === tag);
  if (existing) {
    existing.count++;
    existing.lastUsed = new Date().toISOString();
  } else {
    memory.hashtagsUsed.push({ tag, count: 1, lastUsed: new Date().toISOString() });
  }
  saveContentMemory(memory);
}

export function recordFormatUsed(format: string): void {
  const memory = loadContentMemory();
  const existing = memory.formatsUsed.find((f) => f.format === format);
  if (existing) {
    existing.count++;
    existing.lastUsed = new Date().toISOString();
  } else {
    memory.formatsUsed.push({ format, count: 1, lastUsed: new Date().toISOString() });
  }
  saveContentMemory(memory);
}

export function isTopicOverused(topic: string, threshold = 5): boolean {
  const memory = loadContentMemory();
  const record = memory.topicsUsed.find((t) => t.topic === topic);
  return record ? record.count >= threshold : false;
}

export function isHookOverused(hook: string, threshold = 3): boolean {
  const memory = loadContentMemory();
  const record = memory.hooksUsed.find((h) => h.hook === hook);
  return record ? record.count >= threshold : false;
}

export function isHashtagOverused(tag: string, threshold = 10): boolean {
  const memory = loadContentMemory();
  const record = memory.hashtagsUsed.find((h) => h.tag === tag);
  return record ? record.count >= threshold : false;
}

export function getMostUsedTopics(limit = 10): ContentMemory['topicsUsed'] {
  const memory = loadContentMemory();
  return [...memory.topicsUsed]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function getStaleTopics(daysSinceUse = 14): ContentMemory['topicsUsed'] {
  const memory = loadContentMemory();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysSinceUse);
  return memory.topicsUsed.filter((t) => new Date(t.lastUsed) < cutoff);
}

export function clearContentMemory(): void {
  saveContentMemory(getEmptyMemory());
}
