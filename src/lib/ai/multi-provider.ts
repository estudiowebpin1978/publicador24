// Multi-provider AI with automatic fallback
// Priority: Groq (free) → OpenRouter → Free.ai

import { getAIProvider } from "./provider";

interface AIProviderConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  models?: string[];
  maxTokens?: number;
}

interface TextResult {
  text: string;
  tokens_used: number;
  model: string;
  provider: string;
}

function getProviders(): AIProviderConfig[] {
  const providers: AIProviderConfig[] = [];

  // 1. Groq (free, fast, we have the key)
  if (process.env.GROQ_API_KEY) {
    const groqModel = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
    providers.push({
      name: "groq",
      baseUrl: "https://api.groq.com/openai/v1",
      apiKey: process.env.GROQ_API_KEY,
      model: groqModel,
      models: unique([groqModel, "openai/gpt-oss-20b", "openai/gpt-oss-120b"]),
      maxTokens: 1800,
    });
  }

  // 2. OpenRouter (fallback)
  if (process.env.OPENROUTER_API_KEY) {
    const orModel = process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash";
    providers.push({
      name: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
      model: orModel,
      models: unique([orModel, "google/gemini-2.5-flash"]),
      maxTokens: 800,
    });
  }

  // 4. Google Studio (AI Studio / Gemini) - OpenAI-compatible endpoint
  if (process.env.GOOGLE_STUDIO_API_KEY) {
    const gsModel = process.env.GOOGLE_STUDIO_MODEL || "gemini-3.8-flash";
    providers.push({
      name: "google-studio",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      apiKey: process.env.GOOGLE_STUDIO_API_KEY,
      model: gsModel,
      models: unique([gsModel, "gemini-3.8-flash", "gemini-3-flash-preview", "gemma-4-26b-a4b-it"]),
      maxTokens: 1800,
    });
  }

  // 3. Free.ai (last resort - 30K tokens/day free)
  if (process.env.FREEAI_API_KEY) {
    providers.push({
      name: "freeai",
      baseUrl: "https://api.free.ai/v1",
      apiKey: process.env.FREEAI_API_KEY,
      model: "qwen7b",
      models: ["qwen7b"],
      maxTokens: 2000,
    });
  }

  return providers;
}

function unique(list: string[]): string[] {
  return Array.from(new Set(list.filter(Boolean)));
}

function isTransient(error: Error): boolean {
  return /503|502|429|rate[_ ]limit|UNAVAILABLE|high demand|overloaded|timed? ?out/i.test(
    error.message
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callProvider(
  config: AIProviderConfig,
  messages: Array<{ role: string; content: string }>,
  model: string = config.model
): Promise<TextResult> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: config.maxTokens || 2000,
    }),
    // La cadena prueba varios proveedores y modelos en serie: sin un tope por
    // intento, un modelo lento (se midieron 60-99s) se come el presupuesto del
    // ciclo completo y publica menos campañas.
    signal: AbortSignal.timeout(25_000),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${config.name} error ${response.status}: ${body}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  const tokens = data.usage?.total_tokens || 0;

  return {
    text,
    tokens_used: tokens,
    model,
    provider: config.name,
  };
}

export async function generateTextWithFallback(
  prompt: string,
  systemPrompt?: string
): Promise<TextResult> {
  // DEMO_MODE=true: cero llamadas a proveedores facturables. Se responde con
  // el mock local (JSON válido cuando el prompt lo pide) para que el pipeline
  // siga funcionando de punta a punta sin consumir presupuesto.
  if (process.env.DEMO_MODE === "true") {
    const mock = await getAIProvider().generateText({ prompt, system_prompt: systemPrompt });
    return { text: mock.text, tokens_used: 0, model: mock.model, provider: "demo" };
  }

  const providers = getProviders();
  const messages: Array<{ role: string; content: string }> = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const failures: string[] = [];

  for (const provider of providers) {
    const models = provider.models?.length ? provider.models : [provider.model];

    for (const model of models) {
      const maxAttempts = 2;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          console.log(`Trying ${provider.name} (${model}) attempt ${attempt}...`);
          const result = await callProvider(provider, messages, model);
          // Una respuesta en blanco no sirve: si el modelo devolvio texto
          // vacio se sigue el siguiente en vez de entregar contenido que el
          // pipeline va a descartar igual (perdiendo la publicacion).
          if (!result.text || !result.text.trim()) {
            throw new Error("respuesta vacia del modelo");
          }
          console.log(`Success with ${provider.name}`);
          return result;
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          failures.push(`${provider.name}/${model}: ${err.message.slice(0, 160)}`);
          console.warn(`Failed ${provider.name}/${model}: ${err.message}`);

          if (isTransient(err) && attempt < maxAttempts) {
            await sleep(1500 * attempt);
            continue;
          }
          break;
        }
      }
    }
  }

  throw new Error(
    `All AI providers failed → ${failures.slice(-4).join(" | ")}`
  );
}

export async function generateContentForPlatform(
  platform: string,
  campaignName: string,
  objective: string,
  targetAudience: string,
  brandVoice: string
): Promise<{ hook: string; caption: string; hashtags: string[]; cta: string }> {
  const systemPrompt = `Sos un experto en copywriting para redes sociales en español argentino (voseo). Creá contenido que GENERE DEMANDA y CONECTE con la audiencia. Respondé SIEMPRE con JSON válido, sin texto adicional.`;

  const prompt = `Generá contenido para ${campaignName} en ${platform}.

OBJETIVO: ${objective}
PÚBLICO: ${targetAudience}
TONO: ${brandVoice}

Generá:
1. Hook (primera línea que engancha)
2. Caption completo (2-3 párrafos cortos)
3. 8 hashtags relevantes
4. CTA (call to action)

Respondé con JSON:
{
  "hook": "...",
  "caption": "...",
  "hashtags": ["#tag1", "#tag2"],
  "cta": "..."
}`;

  const result = await generateTextWithFallback(prompt, systemPrompt);

  try {
    const match = result.text.match(/```json\s*([\s\S]*?)```/);
    const jsonStr = match ? match[1] : result.text;
    return JSON.parse(jsonStr.trim());
  } catch {
    return {
      hook: result.text.substring(0, 100),
      caption: result.text,
      hashtags: [],
      cta: "Visitalo ahora",
    };
  }
}
