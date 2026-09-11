import type { SocialPlatform } from '@/types';
import type { RepurposeInput, RepurposeResult, RepurposedVariant } from '@/lib/ai/engines';
import { repurposeContent } from '@/lib/ai/repurpose-engine';
import { loadBrandMemory, getTopHooks, getTopHashtags } from './brand-memory';
import { recordTopicUsed, recordFormatUsed } from './content-memory';

export interface RepurposeOptions {
  preserveCoreMessage?: boolean;
  adaptTone?: boolean;
  includeBrandVoice?: boolean;
  maxVariants?: number;
}

export async function repurposeWithMemory(
  input: RepurposeInput,
  options: RepurposeOptions = {}
): Promise<RepurposeResult> {
  const { includeBrandVoice = true } = options;

  const brandMemory = loadBrandMemory();
  const enrichedInput: RepurposeInput = { ...input };

  if (includeBrandVoice && brandMemory.successfulHooks.length > 0) {
    const topHooks = getTopHooks(undefined, 3);
    const hookExamples = topHooks.map((h) => h.text).join(' | ');
    enrichedInput.originalContent = `${enrichedInput.originalContent}\n\nSuccessful hook examples from your brand: ${hookExamples}`;
  }

  const result = await repurposeContent(enrichedInput);

  const topic = input.topic;
  recordTopicUsed(topic);

  for (const variant of result.variants) {
    recordFormatUsed(variant.format);
  }

  if (options.maxVariants && result.variants.length > options.maxVariants) {
    result.variants = result.variants
      .sort((a, b) => b.score - a.score)
      .slice(0, options.maxVariants);
    result.totalGenerated = result.variants.length;
  }

  return result;
}

export function adaptCaptionForPlatform(
  caption: string,
  platform: SocialPlatform
): string {
  const platformAdapters: Record<SocialPlatform, (c: string) => string> = {
    tiktok: (c) => c.slice(0, 2200),
    instagram: (c) => c.slice(0, 2200),
    facebook: (c) => c.slice(0, 63206),
    x: (c) => c.slice(0, 280),
    youtube: (c) => c.slice(0, 5000),
    linkedin: (c) => c.slice(0, 3000),
  };

  const adapter = platformAdapters[platform];
  return adapter ? adapter(caption) : caption;
}

export function generatePlatformHashtags(
  topic: string,
  platform: SocialPlatform,
  count: number = 10
): string[] {
  const brandTags = getTopHashtags(platform, count);
  if (brandTags.length >= count) {
    return brandTags.slice(0, count).map((t) => t.tag);
  }

  const baseWords = topic
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 5);

  const platformDefaults: Record<SocialPlatform, string[]> = {
    tiktok: ['#fyp', '#viral', '#trending', '#foryou'],
    instagram: ['#instagood', '#reels', '#explore'],
    facebook: ['#facebook', '#community', '#share'],
    x: ['#trending', '#thread', '#hot'],
    youtube: ['#shorts', '#youtube', '#subscribe'],
    linkedin: ['#professional', '#career', '#leadership'],
  };

  const existing = new Set(brandTags.map((t) => t.tag));
  const fromTopic = baseWords.map((w) => `#${w}`).filter((t) => !existing.has(t));
  const fromPlatform = (platformDefaults[platform] || []).filter((t) => !existing.has(t));

  return [...brandTags.map((t) => t.tag), ...fromTopic, ...fromPlatform].slice(0, count);
}

export function mergeRepurposeResults(
  results: RepurposeResult[]
): RepurposeResult {
  const allVariants: RepurposedVariant[] = [];
  const original = results[0]?.original || { content: '', topic: '' };

  for (const result of results) {
    allVariants.push(...result.variants);
  }

  const seen = new Set<string>();
  const unique = allVariants.filter((v) => {
    const key = `${v.platform}:${v.hook}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    original,
    variants: unique.sort((a, b) => b.score - a.score),
    totalGenerated: unique.length,
  };
}
