import type { SocialPlatform } from '@/types';
import { getAIProvider } from './provider';
import type { RepurposeInput, RepurposeResult, RepurposedVariant } from './engines';

const PLATFORM_SPECS: Record<SocialPlatform, { format: string; maxCaption: number; features: string }> = {
  tiktok: { format: 'short-form video', maxCaption: 2200, features: 'trending sounds, hashtags, duets' },
  instagram: { format: 'reel/carousel/post', maxCaption: 2200, features: 'hashtags, locations, mentions' },
  facebook: { format: 'post/video', maxCaption: 63206, features: 'shares, reactions, groups' },
  x: { format: 'tweet/thread', maxCaption: 280, features: 'threads, polls, media' },
  youtube: { format: 'shorts/video', maxCaption: 5000, features: 'timestamps, cards, end screen' },
  linkedin: { format: 'post/article', maxCaption: 3000, features: 'professional tone, articles' },
};

export async function repurposeContent(input: RepurposeInput): Promise<RepurposeResult> {
  const provider = getAIProvider();
  const platforms = input.targetPlatforms || (['tiktok', 'instagram', 'facebook', 'x', 'youtube', 'linkedin'] as SocialPlatform[]);

  const prompt = `Repurpose this content for multiple platforms:

ORIGINAL CONTENT:
"${input.originalContent}"

TOPIC: ${input.topic}
LANGUAGE: ${input.language || 'es'}
TONE: ${input.tone || 'engaging'}
AUDIENCE: ${input.audience || 'general'}

TARGET PLATFORMS: ${platforms.join(', ')}

For each platform, create:
- Hook: attention-grabbing first line
- Caption: platform-optimized text
- Hashtags: 5-10 relevant hashtags
- Mentions: relevant accounts
- CTA: call to action
- Format: recommended content format

Return JSON array with objects containing: platform, hook, caption, hashtags, mentions, cta, format, score (0-100).`;

  const result = await provider.generateText({
    prompt,
    system_prompt: 'You are a content repurposing expert. Adapt content for each platform\'s unique style and audience.',
    temperature: 0.8,
  });

  const variants = parseRepurposed(result.text, platforms);

  return {
    original: { content: input.originalContent, topic: input.topic },
    variants,
    totalGenerated: variants.length,
  };
}

function parseRepurposed(text: string, platforms: SocialPlatform[]): RepurposedVariant[] {
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.map((v: Record<string, unknown>) => ({
        platform: validatePlatform(String(v.platform || 'instagram')),
        hook: String(v.hook || ''),
        caption: String(v.caption || ''),
        hashtags: Array.isArray(v.hashtags) ? v.hashtags.map(String) : [],
        mentions: Array.isArray(v.mentions) ? v.mentions.map(String) : [],
        cta: String(v.cta || ''),
        format: String(v.format || 'post'),
        score: clamp(Number(v.score || 70)),
      }));
    }
  } catch { /* fallback */ }

  return platforms.map((platform, i) => ({
    platform,
    hook: `Check this out about the topic`,
    caption: `Great content about ${platform}`,
    hashtags: [`#${platform}`, '#content', '#viral'],
    mentions: [],
    cta: 'Follow for more!',
    format: PLATFORM_SPECS[platform]?.format || 'post',
    score: clamp(75 - i * 3),
  }));
}

function validatePlatform(platform: string): SocialPlatform {
  const valid: SocialPlatform[] = ['tiktok', 'instagram', 'facebook', 'x', 'youtube', 'linkedin'];
  return valid.includes(platform as SocialPlatform) ? platform as SocialPlatform : 'instagram';
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
