import type { SocialPlatform } from '@/types';
import type { TrendAlert } from '@/lib/ai/engines';
import { getAIProvider } from '@/lib/ai/provider';

const STORAGE_KEY = 'trend_alerts';

export interface TrendAlertConfig {
  keywords: string[];
  platforms: SocialPlatform[];
  minRelevance: number;
  minScore: number;
  language?: string;
  country?: string;
}

export function loadTrendAlerts(): TrendAlert[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TrendAlert[];
  } catch {
    return [];
  }
}

export function saveTrendAlerts(alerts: TrendAlert[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
}

export function addTrendAlert(alert: TrendAlert): void {
  const alerts = loadTrendAlerts();
  const existing = alerts.findIndex(
    (a) => a.keyword === alert.keyword && a.platform === alert.platform
  );
  if (existing >= 0) {
    alerts[existing] = alert;
  } else {
    alerts.push(alert);
  }
  if (alerts.length > 100) {
    alerts.splice(0, alerts.length - 100);
  }
  saveTrendAlerts(alerts);
}

export function removeTrendAlert(id: string): void {
  const alerts = loadTrendAlerts().filter((a) => a.id !== id);
  saveTrendAlerts(alerts);
}

export function clearTrendAlerts(): void {
  saveTrendAlerts([]);
}

export function getAlertsByPlatform(platform: SocialPlatform): TrendAlert[] {
  return loadTrendAlerts().filter((a) => a.platform === platform);
}

export function getAlertsByDirection(direction: TrendAlert['direction']): TrendAlert[] {
  return loadTrendAlerts().filter((a) => a.direction === direction);
}

export function getHighRelevanceAlerts(minRelevance = 70): TrendAlert[] {
  return loadTrendAlerts().filter((a) => a.relevance >= minRelevance);
}

export function getRisingAlerts(): TrendAlert[] {
  return getAlertsByDirection('RISING');
}

export async function scanTrends(config: TrendAlertConfig): Promise<TrendAlert[]> {
  const provider = getAIProvider();
  const { keywords, platforms, minRelevance, minScore, language, country } = config;

  const prompt = `Analyze these trending keywords and identify content opportunities:

Keywords: ${keywords.join(', ')}
Platforms: ${platforms.join(', ')}
Language: ${language || 'es'}
Country: ${country || 'global'}

For each keyword, provide:
- Relevance score (0-100): How relevant is this to content creators?
- Trend score (0-100): How hot is this trend right now?
- Direction: RISING, STABLE, or DECLINING
- Suggested content: Brief content idea

Return JSON array with: keyword, relevance, score, direction, suggestedContent, platform.`;

  const result = await provider.generateText({
    prompt,
    system_prompt: 'You are a trend analyst. Identify the best content opportunities from trending topics.',
    temperature: 0.6,
  });

  const alerts = parseTrendAlerts(result.text, platforms);

  const filtered = alerts.filter(
    (a) => a.relevance >= minRelevance && a.score >= minScore
  );

  for (const alert of filtered) {
    addTrendAlert(alert);
  }

  return filtered;
}

function parseTrendAlerts(text: string, platforms: SocialPlatform[]): TrendAlert[] {
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.map((a: Record<string, unknown>) => ({
        id: generateId(),
        keyword: String(a.keyword || ''),
        relevance: clamp(Number(a.relevance || 50)),
        score: clamp(Number(a.score || 50)),
        direction: validateDirection(String(a.direction || 'STABLE')),
        suggestedContent: String(a.suggestedContent || ''),
        platform: validatePlatform(String(a.platform || platforms[0] || 'instagram')),
        detectedAt: new Date().toISOString(),
      }));
    }
  } catch { /* fallback */ }

  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  return lines.slice(0, 10).map((line, i) => ({
    id: generateId(),
    keyword: line.replace(/^\d+[\.\)]\s*/, '').trim(),
    relevance: clamp(60 - i * 3),
    score: clamp(65 - i * 4),
    direction: 'RISING' as const,
    suggestedContent: `Content about ${line.trim()}`,
    platform: platforms[i % platforms.length] || 'instagram',
    detectedAt: new Date().toISOString(),
  }));
}

function generateId(): string {
  return `ta_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function validateDirection(direction: string): TrendAlert['direction'] {
  if (['RISING', 'STABLE', 'DECLINING'].includes(direction)) {
    return direction as TrendAlert['direction'];
  }
  return 'STABLE';
}

function validatePlatform(platform: string): SocialPlatform {
  const valid: SocialPlatform[] = ['tiktok', 'instagram', 'facebook', 'x', 'youtube', 'linkedin'];
  return valid.includes(platform as SocialPlatform) ? platform as SocialPlatform : 'instagram';
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
