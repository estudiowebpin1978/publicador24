interface ContentPlan {
  topics: string[];
  hooks: string[];
  formats: string[];
  funnelStages: string[];
  bestPerforming: { topic: string; hook: string; format: string; score: number }[];
  worstPerforming: { topic: string; hook: string; format: string; score: number }[];
  platformPreferences: Record<string, string[]>;
}

const emptyPlan: ContentPlan = {
  topics: [],
  hooks: [],
  formats: [],
  funnelStages: [],
  bestPerforming: [],
  worstPerforming: [],
  platformPreferences: {},
};

export async function readStrategyMemory(_campaignId: string): Promise<ContentPlan> {
  return emptyPlan;
}

export async function writeStrategyMemory(_entry: {
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
  // No-op: Convex removed
}
