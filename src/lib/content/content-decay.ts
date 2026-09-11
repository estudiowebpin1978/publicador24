import type { ContentDecayItem } from '@/lib/ai/engines';

export interface DecayConfig {
  refreshThreshold: number;
  repurposeThreshold: number;
  archiveThreshold: number;
  decayWindowDays: number;
}

const DEFAULT_CONFIG: DecayConfig = {
  refreshThreshold: 40,
  repurposeThreshold: 25,
  archiveThreshold: 10,
  decayWindowDays: 30,
};

export function calculateDecayRate(
  originalScore: number,
  currentScore: number,
  daysSincePublish: number
): number {
  if (daysSincePublish <= 0 || originalScore <= 0) return 0;
  const decay = (originalScore - currentScore) / originalScore;
  return Math.max(0, decay / daysSincePublish);
}

export function suggestDecayAction(
  currentScore: number,
  decayRate: number,
  daysSincePublish: number,
  config: DecayConfig = DEFAULT_CONFIG
): { action: ContentDecayItem['suggestedAction']; reason: string } {
  if (currentScore <= config.archiveThreshold) {
    return {
      action: 'archive',
      reason: `Content score dropped to ${currentScore}/100 after ${daysSincePublish} days`,
    };
  }

  if (currentScore <= config.repurposeThreshold || decayRate > 0.02) {
    return {
      action: 'repurpose',
      reason: `Decay rate of ${(decayRate * 100).toFixed(1)}%/day suggests content needs fresh angle`,
    };
  }

  if (currentScore <= config.refreshThreshold) {
    return {
      action: 'refresh',
      reason: `Score at ${currentScore}/100 — update hashtags, caption, or hook`,
    };
  }

  return {
    action: 'refresh',
    reason: 'Content performing adequately',
  };
}

export function analyzeContentDecay(
  items: Array<{
    contentId: string;
    title: string;
    originalScore: number;
    currentScore: number;
    daysSincePublish: number;
  }>,
  config: DecayConfig = DEFAULT_CONFIG
): ContentDecayItem[] {
  return items.map((item) => {
    const decayRate = calculateDecayRate(
      item.originalScore,
      item.currentScore,
      item.daysSincePublish
    );
    const { action, reason } = suggestDecayAction(
      item.currentScore,
      decayRate,
      item.daysSincePublish,
      config
    );

    return {
      contentId: item.contentId,
      title: item.title,
      originalScore: item.originalScore,
      currentScore: item.currentScore,
      daysSincePublish: item.daysSincePublish,
      decayRate,
      suggestedAction: action,
      suggestedReason: reason,
    };
  });
}

export function getDecayedItems(items: ContentDecayItem[]): ContentDecayItem[] {
  return items.filter((item) => item.suggestedAction !== 'refresh' || item.currentScore < 50);
}

export function getUrgentItems(items: ContentDecayItem[]): ContentDecayItem[] {
  return items.filter((item) => item.suggestedAction === 'archive' || item.decayRate > 0.03);
}

export function sortByDecayUrgency(items: ContentDecayItem[]): ContentDecayItem[] {
  const actionPriority: Record<ContentDecayItem['suggestedAction'], number> = {
    archive: 0,
    repurpose: 1,
    refresh: 2,
  };
  return [...items].sort((a, b) => {
    const pa = actionPriority[a.suggestedAction];
    const pb = actionPriority[b.suggestedAction];
    if (pa !== pb) return pa - pb;
    return a.decayRate - b.decayRate;
  });
}
