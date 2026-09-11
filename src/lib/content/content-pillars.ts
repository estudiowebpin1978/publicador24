import type {
  ContentPillar,
  PillarType,
  ContentMixConfig,
  ContentMixResult,
} from '@/lib/ai/engines';

const STORAGE_KEY = 'content_pillars';

const DEFAULT_PILLARS: ContentPillar[] = [
  { type: 'educational', name: 'Educación', percentage: 30, description: 'Teach your audience something valuable' },
  { type: 'entertainment', name: 'Entretenimiento', percentage: 25, description: 'Fun and engaging content' },
  { type: 'promotional', name: 'Promocional', percentage: 15, description: 'Products, services, offers' },
  { type: 'inspirational', name: 'Inspiración', percentage: 15, description: 'Motivational and uplifting' },
  { type: 'behind_the_scenes', name: 'Detrás de cámaras', percentage: 15, description: 'Authentic behind-the-scenes' },
];

export function loadPillars(): ContentPillar[] {
  if (typeof window === 'undefined') return DEFAULT_PILLARS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PILLARS;
    return JSON.parse(raw) as ContentPillar[];
  } catch {
    return DEFAULT_PILLARS;
  }
}

export function savePillars(pillars: ContentPillar[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pillars));
}

export function addPillar(pillar: ContentPillar): void {
  const pillars = loadPillars();
  const existing = pillars.findIndex((p) => p.type === pillar.type);
  if (existing >= 0) {
    pillars[existing] = pillar;
  } else {
    pillars.push(pillar);
  }
  normalizePillarPercentages(pillars);
  savePillars(pillars);
}

export function removePillar(type: PillarType): void {
  const pillars = loadPillars().filter((p) => p.type !== type);
  normalizePillarPercentages(pillars);
  savePillars(pillars);
}

export function updatePillarPercentage(type: PillarType, percentage: number): void {
  const pillars = loadPillars();
  const pillar = pillars.find((p) => p.type === type);
  if (pillar) {
    pillar.percentage = Math.max(0, Math.min(100, percentage));
    normalizePillarPercentages(pillars);
    savePillars(pillars);
  }
}

function normalizePillarPercentages(pillars: ContentPillar[]): void {
  const total = pillars.reduce((sum, p) => sum + p.percentage, 0);
  if (total > 0 && total !== 100) {
    const factor = 100 / total;
    for (const pillar of pillars) {
      pillar.percentage = Math.round(pillar.percentage * factor);
    }
    const diff = 100 - pillars.reduce((sum, p) => sum + p.percentage, 0);
    if (pillars.length > 0 && diff !== 0) {
      pillars[0].percentage += diff;
    }
  }
}

export function generateContentMix(config: ContentMixConfig): ContentMixResult {
  const { pillars, totalPosts } = config;
  const schedule: ContentMixResult['schedule'] = [];
  const distribution = {} as Record<PillarType, number>;

  for (const pillar of pillars) {
    const count = Math.round((pillar.percentage / 100) * totalPosts);
    schedule.push({ pillar, count });
    distribution[pillar.type] = count;
  }

  const totalAssigned = schedule.reduce((sum, s) => sum + s.count, 0);
  if (totalAssigned < totalPosts && schedule.length > 0) {
    schedule[0].count += totalPosts - totalAssigned;
    distribution[schedule[0].pillar.type] = schedule[0].count;
  }

  return { schedule, distribution };
}

export function suggestPillarForContent(contentType: string): PillarType {
  const typeMap: Record<string, PillarType> = {
    tutorial: 'tutorial',
    how_to: 'tutorial',
    tip: 'educational',
    learn: 'educational',
    teach: 'educational',
    funny: 'entertainment',
    meme: 'entertainment',
    trend: 'entertainment',
    product: 'promotional',
    sale: 'promotional',
    offer: 'promotional',
    motivational: 'inspirational',
    quote: 'inspirational',
    story: 'behind_the_scenes',
    bts: 'behind_the_scenes',
    behind: 'behind_the_scenes',
    news: 'news',
    update: 'news',
    announcement: 'news',
  };

  const lower = contentType.toLowerCase();
  for (const [keyword, pillar] of Object.entries(typeMap)) {
    if (lower.includes(keyword)) return pillar;
  }
  return 'educational';
}

export function getPillarDistribution(): Record<PillarType, number> {
  const pillars = loadPillars();
  const dist = {} as Record<PillarType, number>;
  for (const pillar of pillars) {
    dist[pillar.type] = pillar.percentage;
  }
  return dist;
}
