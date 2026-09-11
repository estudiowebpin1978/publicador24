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
import { createLogger } from '@/lib/logger';

const logger = createLogger({ request_id: 'ai-openai' });

interface OpenAIChatMessage {
  role: 'system' | 'user';
  content: string;
}

interface OpenAIChatResponse {
  id: string;
  choices: Array<{
    message: { content: string };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getApiKey(): string {
  const key = process.env.AI_API_KEY;
  if (!key) throw new Error('AI_API_KEY environment variable is not set');
  return key;
}

function getBaseUrl(): string {
  return process.env.AI_API_BASE_URL || 'https://api.openai.com/v1';
}

function getModel(): string {
  return process.env.AI_MODEL || 'gpt-4o-mini';
}

async function chatCompletion(messages: OpenAIChatMessage[]): Promise<OpenAIChatResponse> {
  const apiKey = getApiKey();
  const baseUrl = getBaseUrl();
  const model = getModel();

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model, messages, temperature: 0.7 }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`OpenAI API error ${response.status}: ${body}`);
      }

      const data = (await response.json()) as OpenAIChatResponse;
      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.warn('openai_retry', `Attempt ${attempt}/${MAX_RETRIES} failed`, {
        error: lastError.message,
      });
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  throw lastError || new Error('OpenAI API failed after retries');
}

function parseJSONResponse<T>(text: string): T {
  const match = text.match(/```json\s*([\s\S]*?)```/);
  const jsonStr = match ? match[1] : text;
  return JSON.parse(jsonStr.trim()) as T;
}

export class OpenAIProvider implements AIProvider {
  async generateText(input: AITextInput): Promise<AITextResult> {
    const messages: OpenAIChatMessage[] = [];
    if (input.system_prompt) {
      messages.push({ role: 'system', content: input.system_prompt });
    }
    messages.push({ role: 'user', content: input.prompt });

    const response = await chatCompletion(messages);
    const text = response.choices[0]?.message.content || '';

    return {
      text,
      tokens_used: response.usage.total_tokens,
      model: response.model,
    };
  }

  async analyzeContent(input: AIAnalysisInput): Promise<AIAnalysisResult> {
    const systemPrompt = `Eres un experto en análisis de contenido para redes sociales. Responde SIEMPRE con JSON válido, sin texto adicional.`;

    const userPrompt = `Analiza el siguiente contenido:
Contenido: "${input.content}"
Plataforma: ${input.platform || 'general'}
Idioma: ${input.language || 'es'}
Audiencia: ${input.audience || 'general'}

Responde con JSON:
{
  "topic": "tema principal",
  "intent": "intención (promotional|educational|entertainment|informational|engagement)",
  "audience": "audiencia objetivo",
  "tone": "tono",
  "emotions": ["emoción1", "emoción2"],
  "keywords": ["palabra1", "palabra2"],
  "entities": ["entidad1"],
  "language": "${input.language || 'es'}",
  "sentiment": 0.0-1.0
}`;

    const response = await chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    return parseJSONResponse<AIAnalysisResult>(response.choices[0].message.content);
  }

  async generateHashtags(input: HashtagInput): Promise<HashtagResult> {
    const count = input.count || 10;
    const systemPrompt = `Eres un experto en hashtags para redes sociales. Responde SIEMPRE con JSON válido, sin texto adicional.`;

    const userPrompt = `Genera ${count} hashtags para el siguiente contenido:
Contenido: "${input.content}"
Plataforma: ${input.platform}
Idioma: ${input.language}
País: ${input.country || 'global'}

Responde con JSON:
{
  "hashtags": [
    {
      "tag": "#hashtag",
      "category": "trending|niche|branded|topic|community",
      "relevance": 0.0-1.0,
      "popularity": 0.0-1.0,
      "competition": 0.0-1.0,
      "trend": 0.0-1.0,
      "final_score": 0.0-1.0,
      "is_estimated": false
    }
  ]
}`;

    const response = await chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    return parseJSONResponse<HashtagResult>(response.choices[0].message.content);
  }

  async analyzeTrend(input: TrendInput): Promise<TrendResult> {
    const systemPrompt = `Eres un experto en tendencias de redes sociales. Responde SIEMPRE con JSON válido, sin texto adicional.`;

    const userPrompt = `Analiza las siguientes tendencias:
Palabras clave: ${input.keywords.join(', ')}
Plataforma: ${input.platform || 'todas'}
País: ${input.country || 'global'}
Idioma: ${input.language || 'es'}

Responde con JSON:
{
  "trends": [
    {
      "keyword": "palabra",
      "direction": "RISING|STABLE|DECLINING",
      "score": 0-100,
      "growth_rate": -100 a 100,
      "related_hashtags": ["#tag1", "#tag2"]
    }
  ]
}`;

    const response = await chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    return parseJSONResponse<TrendResult>(response.choices[0].message.content);
  }

  async generateVariants(input: VariantInput): Promise<VariantResult> {
    const count = input.variant_count || 3;
    const systemPrompt = `Eres un experto en copywriting para redes sociales. Responde SIEMPRE con JSON válido, sin texto adicional.`;

    const userPrompt = `Genera ${count} variantes del siguiente contenido para ${input.platform}:
Contenido original: "${input.content}"
Preservar significado: ${input.preserve_meaning !== false}

Responde con JSON:
{
  "variants": [
    {
      "label": "Nombre de variante",
      "hook": "Gancho inicial",
      "caption": "Caption completo",
      "hashtags": ["#tag1", "#tag2"],
      "cta": "Call to action",
      "score": 0-100
    }
  ]
}`;

    const response = await chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    return parseJSONResponse<VariantResult>(response.choices[0].message.content);
  }

  async scoreContent(input: ScoreInput): Promise<ScoreResult> {
    const systemPrompt = `Eres un experto en optimización de contenido para redes sociales. Responde SIEMPRE con JSON válido, sin texto adicional.`;

    const userPrompt = `Puntúa el siguiente contenido para ${input.platform}:
Contenido: "${input.content}"
${input.hook ? `Gancho: "${input.hook}"` : ''}
${input.hashtags?.length ? `Hashtags: ${input.hashtags.join(', ')}` : ''}
${input.cta ? `CTA: "${input.cta}"` : ''}

Responde con JSON:
{
  "overall": 0-100,
  "breakdown": {
    "hook": 0-100,
    "relevance": 0-100,
    "clarity": 0-100,
    "emotion": 0-100,
    "trend": 0-100,
    "hashtags": 0-100,
    "platform_fit": 0-100,
    "cta": 0-100
  },
  "explanation": "explicación del puntaje",
  "suggestions": ["sugerencia1", "sugerencia2"]
}`;

    const response = await chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    return parseJSONResponse<ScoreResult>(response.choices[0].message.content);
  }
}
