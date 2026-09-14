import { ConvexHttpClient } from 'convex/browser';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface StrategyMemory {
  _id: string;
  campaignId: string;
  topic: string;
  hook: string;
  contentType: string;
  platform: string;
  funnelStage: string;
  score: number;
  impressions?: number;
  engagement?: number;
  publishedAt: number;
  publishedPostId?: string;
}

interface ContentPlan {
  topics: string[];
  hooks: string[];
  formats: string[];
  funnelStages: string[];
  bestPerforming: { topic: string; hook: string; format: string; score: number }[];
  worstPerforming: { topic: string; hook: string; format: string; score: number }[];
  platformPreferences: Record<string, string[]>;
}

export async function readStrategyMemory(campaignId: string): Promise<ContentPlan> {
  try {
    const { api } = await import('@convex/_generated/api');
    const memories = await convex.query(api.strategyMemory.getByCampaign, { campaignId });

    if (!memories || memories.length === 0) {
      return {
        topics: [],
        hooks: [],
        formats: [],
        funnelStages: [],
        bestPerforming: [],
        worstPerforming: [],
        platformPreferences: {},
      };
    }

    const sorted = [...memories].sort((a: StrategyMemory, b: StrategyMemory) => b.score - a.score);
    const topThird = Math.max(1, Math.floor(sorted.length / 3));
    const bottomThird = Math.max(1, Math.floor(sorted.length / 3));

    const platformPrefs: Record<string, string[]> = {};
    for (const m of memories) {
      if (!platformPrefs[m.platform]) platformPrefs[m.platform] = [];
      if (!platformPrefs[m.platform].includes(m.contentType)) {
        platformPrefs[m.platform].push(m.contentType);
      }
    }

    return {
      topics: [...new Set(memories.map((m: StrategyMemory) => m.topic))],
      hooks: sorted.slice(0, 10).map((m: StrategyMemory) => m.hook),
      formats: [...new Set(memories.map((m: StrategyMemory) => m.contentType))],
      funnelStages: [...new Set(memories.map((m: StrategyMemory) => m.funnelStage))],
      bestPerforming: sorted.slice(0, topThird).map((m: StrategyMemory) => ({
        topic: m.topic, hook: m.hook, format: m.contentType, score: m.score,
      })),
      worstPerforming: sorted.slice(-bottomThird).map((m: StrategyMemory) => ({
        topic: m.topic, hook: m.hook, format: m.contentType, score: m.score,
      })),
      platformPreferences: platformPrefs,
    };
  } catch (error) {
    console.warn('Failed to read strategy memory:', error);
    return {
      topics: [], hooks: [], formats: [], funnelStages: [],
      bestPerforming: [], worstPerforming: [], platformPreferences: {},
    };
  }
}

export async function writeStrategyMemory(entry: {
  campaignId: string;
  topic: string;
  hook: string;
  contentType: string;
  platform: string;
  funnelStage: string;
  score: number;
  impressions?: number;
  engagement?: number;
  publishedPostId?: string;
}): Promise<void> {
  try {
    const { api } = await import('@convex/_generated/api');
    await convex.mutation(api.strategyMemory.create, {
      campaignId: entry.campaignId as string & { __tableName: 'campaigns' },
      topic: entry.topic,
      hook: entry.hook,
      contentType: entry.contentType,
      platform: entry.platform,
      funnelStage: entry.funnelStage,
      score: entry.score,
      impressions: entry.impressions,
      engagement: entry.engagement,
      publishedAt: Date.now(),
      publishedPostId: entry.publishedPostId,
    });
  } catch (error) {
    console.warn('Failed to write strategy memory:', error);
  }
}
