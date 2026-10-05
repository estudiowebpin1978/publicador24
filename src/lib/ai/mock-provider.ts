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

/**
 * Genera la respuesta del "mock" según lo que pide el prompt.
 * Los engines parsean arrays JSON (`text.match(/\[[\s\S]*\]/)`), así que en
 * demo devolvemos JSON real: el pipeline se recorre entero sin costo.
 */
function extractPromptTopic(prompt: string): string {
  const patterns = [
    /for a niche:\s*"([^"]{3,120})"/i,
    /about:\s*"([^"]{3,120})"/i,
    /topic:\s*"([^"]{3,120})"/i,
    /topic:\s*([^\n]{3,80})/i,
    /niche:\s*"([^"]{3,120})"/i,
  ];
  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return 'contenido de valor para tu audiencia';
}

function mockHookTemplates(topic: string): string[] {
  return [
    `Nadie te contó esto sobre ${topic} (y te conviene saberlo)`,
    `¿Vas a seguir haciendo esto mal en ${topic}?`,
    `3 errores que todos cometen con ${topic} — el último es caro`,
    `Probé ${topic} 30 días y esto es lo que descubrí`,
    `Si recién arrancás con ${topic}, leé esto antes de gastar plata`,
    `Lo que nadie te dice de ${topic} (y por qué te conviene)`,
    `Esto es lo que separa a los que ganan de los que solo intentan en ${topic}`,
    `La regla de ${topic} que te ahorra tiempo y plata`,
    `Dejá de hacer esto si querés resultados con ${topic}`,
    `Lo primero que haría si arrancara de cero con ${topic}`,
  ];
}

function mockTextForPrompt(prompt: string): string {
  const topic = extractPromptTopic(prompt);
  const wantsIdeas = /content ideas for a niche|title, hook, angle, format, platform, pillar/i.test(prompt);
  const wantsHooks = /engaging hooks|text, type, score/i.test(prompt);
  const wantsCaptions = /Generate one caption for each style|wordCount, score/i.test(prompt);

  const hooks = mockHookTemplates(topic);

  if (wantsIdeas) {
    const formats = ['reel', 'carrusel', 'post', 'story', 'short'];
    const platforms = ['instagram', 'tiktok', 'youtube', 'facebook', 'x'];
    const pillars = ['educational', 'entertainment', 'promotional', 'inspirational', 'behind_the_scenes'];
    const ideas = hooks.slice(0, 5).map((hook, i) => ({
      title: `${topic} — ángulo ${i + 1}`,
      hook,
      angle: [
        'Error común y su corrección',
        'Comparación honesta de opciones',
        'Mini tutorial paso a paso',
        'Mito vs. realidad',
        'Historia corta con resultado',
      ][i % 5],
      format: formats[i % formats.length],
      platform: platforms[i % platforms.length],
      pillar: pillars[i % pillars.length],
      score: 85 - i * 3,
      description: `Pieza sobre ${topic} con enfoque práctico y cercano.`,
    }));
    return JSON.stringify(ideas);
  }

  if (wantsHooks) {
    const types = ['curiosity', 'contrarian', 'problem', 'story', 'list', 'surprise', 'question', 'benefit', 'solution', 'fear'];
    const list = hooks.map((text, i) => ({ text, type: types[i % types.length], score: 90 - i * 4 }));
    return JSON.stringify(list);
  }

  if (wantsCaptions) {
    const styles = ['original', 'short', 'long', 'storytelling', 'educational', 'promotional'];
    const captions = styles.map((style, i) => {
      const text = [
        `Arrancamos simple con ${topic}: primero entendés el problema, después elegís la solución. Sin vueltas y sin promesas mágicas.\n\n¿Ya lo probaste? Contame en los comentarios.`,
        `${topic}, sin humo. Tres pasos: mirá, compará, decidí.`,
        `La historia corta: muchos empiezan con ${topic} por presión, pocos lo hacen con método. El que lo hace con datos llega más lejos, porque mide qué funciona y descarta qué no. Cuando dejás de adivinar y empezás a mirar números, todo cambia: menos frustración, mejores decisiones y una rutina que se sostiene sola.`,
        `Había una vez alguien que probaba todo con ${topic} sin plan. Después anotó lo que hacía, comparó resultados y en dos semanas ya sabía qué funcionaba. Esa es toda la magia.`,
        `Dato útil sobre ${topic}: si no lo medís, no lo mejorás. Tres claves: constancia, registro y revisión semanal.`,
        `Si buscás ${topic}, esto te conviene: propuesta clara, sin letra chica y con acompañamiento real.`,
      ][i % 6];
      return {
        text,
        style,
        wordCount: text.split(/\s+/).length,
        score: 88 - i * 2,
      };
    });
    return JSON.stringify(captions);
  }

  // Respuesta genérica en prosa (los engines tienen fallback por líneas)
  return [
    `${topic}: lo importante es arrancar con un ángulo claro y concreto.`,
    `Contenido sobre ${topic} pensado para una audiencia que valora el detalle.`,
    `Cada pieza de ${topic} debe terminar con un llamado a la acción concreto.`,
  ].join('\n\n');
}

export class MockAIProvider implements AIProvider {
  async generateText(input: AITextInput): Promise<AITextResult> {
    // Demo mode: sin llamadas externas. Devolvemos JSON válido cuando el
    // prompt lo pide, así los engines (ideas/hooks/captions) recorren el
    // pipeline completo igual que con IA real.
    const text = mockTextForPrompt(input.prompt);
    const wordCount = text.split(/\s+/).length;

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
