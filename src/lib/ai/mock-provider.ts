import type {
  AIProvider,
  AITextInput,
  AITextResult,
  AIAnalysisInput,
  AIAnalysisResult,
  HashtagInput,
  HashtagResult,
  TrendInput,
  TrendResult,
  VariantInput,
  VariantResult,
  ScoreInput,
  ScoreResult,
} from './types';

const MOCK_MODEL = 'mock-gpt-4';

function randomBetween(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function generateMockHashtags(content: string, platform: string, count: number): HashtagResult['hashtags'] {
  const baseWords = content
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúñü\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3);

  const uniqueWords = [...new Set(baseWords)].slice(0, 5);
  const platformTags: Record<string, string[]> = {
    tiktok: ['#fyp', '#viral', '#trending', '#foryou', '#duet', '#stitch', '#capcut', '#tiktokviral'],
    instagram: ['#instagood', '#photooftheday', '#picoftheday', '#instadaily', '#reels', '#explore'],
    facebook: ['#facebook', '#status', '#share', '#friends', '#community', '#trending'],
    x: ['#twitter', '#trending', '#breaking', '#hot', '#viral', '#thread'],
    youtube: ['#shorts', '#youtube', '#subscribe', '#viral', '#trending', '#youtubeshorts'],
    linkedin: ['#linkedin', '#professional', '#career', '#business', '#networking', '#leadership'],
  };

  const tags = platformTags[platform] || platformTags.tiktok;
  const generated = uniqueWords.map((w) => ({
    tag: `#${w}`,
    category: 'topic',
    relevance: randomBetween(0.6, 0.95),
    popularity: randomBetween(0.3, 0.9),
    competition: randomBetween(0.2, 0.8),
    trend: randomBetween(0.4, 0.9),
    final_score: randomBetween(0.5, 0.9),
    is_estimated: true,
  }));

  const platformGenerated = tags.slice(0, Math.max(0, count - generated.length)).map((tag) => ({
    tag,
    category: 'trending',
    relevance: randomBetween(0.4, 0.7),
    popularity: randomBetween(0.6, 0.95),
    competition: randomBetween(0.5, 0.9),
    trend: randomBetween(0.5, 0.8),
    final_score: randomBetween(0.5, 0.8),
    is_estimated: true,
  }));

  return [...generated, ...platformGenerated]
    .sort((a, b) => b.final_score - a.final_score)
    .slice(0, count);
}

export class MockAIProvider implements AIProvider {
  async generateText(_input: AITextInput): Promise<AITextResult> {
    void _input
    const wordCount = Math.floor(Math.random() * 50) + 30;
    const words = [
      'Descubre', 'el', 'secreto', 'para', 'transformar', 'tu', 'contenido',
      'en', 'publicaciones', 'que', 'generan', 'resultados', 'reales.',
      'Nuestro', 'motor', 'de', 'inteligencia', 'artificial', 'analiza',
      'tendencias', 'y', 'crea', 'copies', 'que', 'conectan', 'con',
      'tu', 'audiencia', 'de', 'manera', 'auténtica.', 'Optimiza',
      'cada', 'publicación', 'con', 'datos', 'y', 'alcanza', 'más',
      'personas', 'cada', 'día.',
    ];
    const text = words.slice(0, wordCount).join(' ');

    return {
      text,
      tokens_used: wordCount + 20,
      model: MOCK_MODEL,
    };
  }

  async analyzeContent(input: AIAnalysisInput): Promise<AIAnalysisResult> {
    return {
      topic: 'Marketing digital',
      intent: 'promotional',
      audience: input.audience || 'general',
      tone: 'professional',
      emotions: ['confidence', 'motivation', 'curiosity'],
      keywords: ['marketing', 'contenido', 'estrategia', 'resultados', 'audiencia'],
      entities: [],
      language: input.language || 'es',
      sentiment: randomBetween(0.6, 0.9),
    };
  }

  async generateHashtags(input: HashtagInput): Promise<HashtagResult> {
    const count = input.count || 10;
    return {
      hashtags: generateMockHashtags(input.content, input.platform, count),
    };
  }

  async analyzeTrend(input: TrendInput): Promise<TrendResult> {
    return {
      trends: input.keywords.map((keyword) => ({
        keyword,
        direction: (['RISING', 'STABLE', 'DECLINING'] as const)[Math.floor(Math.random() * 3)],
        score: randomBetween(40, 95),
        growth_rate: randomBetween(-20, 50),
        related_hashtags: [`#${keyword.toLowerCase()}`, '#trending', '#viral'],
      })),
    };
  }

  async generateVariants(input: VariantInput): Promise<VariantResult> {
    const count = input.variant_count || 3;
    const variants = Array.from({ length: count }, (_, i) => ({
      label: `Variant ${String.fromCharCode(65 + i)}`,
      hook: `Hook alternativo ${i + 1}: impacta desde la primera línea`,
      caption: `Caption optimizado para ${input.platform} con tono profesional y llamado a la acción claro.`,
      hashtags: ['#marketing', '#contenido', '#estrategia', `#variant${i + 1}`],
      cta: i % 2 === 0 ? '¡Comparte si te sirvió!' : 'Guarda para después',
      score: randomBetween(60, 95),
    }));

    return { variants };
  }

  async scoreContent(_input: ScoreInput): Promise<ScoreResult> {
    void _input
    const hook = randomBetween(50, 90);
    const relevance = randomBetween(60, 95);
    const clarity = randomBetween(55, 92);
    const emotion = randomBetween(45, 88);
    const trend = randomBetween(40, 85);
    const hashtags = randomBetween(50, 90);
    const platform_fit = randomBetween(55, 93);
    const cta = randomBetween(40, 87);

    const overall = Math.round(
      hook * 0.15 +
      relevance * 0.15 +
      clarity * 0.1 +
      emotion * 0.1 +
      trend * 0.15 +
      hashtags * 0.1 +
      platform_fit * 0.15 +
      cta * 0.1
    );

    return {
      overall,
      breakdown: { hook, relevance, clarity, emotion, trend, hashtags, platform_fit, cta },
      explanation: `Contenido con puntuación ${overall}/100. Fortalezas en relevancia y adaptación a plataforma.`,
      suggestions: [
        'Mejorar el gancho inicial para captar atención más rápido',
        'Añadir un CTA más directo y específico',
        'Considerar incluir datos o estadísticas para mayor credibilidad',
      ],
    };
  }
}
