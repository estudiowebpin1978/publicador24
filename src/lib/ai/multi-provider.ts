// Multi-provider AI with automatic fallback
// Priority: Groq (free) → OpenRouter → Free.ai

interface AIProviderConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
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
    providers.push({
      name: "groq",
      baseUrl: "https://api.groq.com/openai/v1",
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
      maxTokens: 800,
    });
  }

  // 2. OpenRouter (fallback)
  if (process.env.OPENROUTER_API_KEY) {
    providers.push({
      name: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash",
      maxTokens: 800,
    });
  }

  // 3. Free.ai (last resort - 30K tokens/day free)
  if (process.env.FREEAI_API_KEY) {
    providers.push({
      name: "freeai",
      baseUrl: "https://api.free.ai/v1",
      apiKey: process.env.FREEAI_API_KEY,
      model: "qwen7b",
      maxTokens: 2000,
    });
  }

  return providers;
}

async function callProvider(
  config: AIProviderConfig,
  messages: Array<{ role: string; content: string }>
): Promise<TextResult> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.7,
      max_tokens: config.maxTokens || 2000,
    }),
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
    model: config.model,
    provider: config.name,
  };
}

export async function generateTextWithFallback(
  prompt: string,
  systemPrompt?: string
): Promise<TextResult> {
  const providers = getProviders();
  const messages: Array<{ role: string; content: string }> = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  let lastError: Error | null = null;

  for (const provider of providers) {
    try {
      console.log(`Trying ${provider.name}...`);
      const result = await callProvider(provider, messages);
      console.log(`Success with ${provider.name}`);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Failed ${provider.name}: ${lastError.message}`);
      continue;
    }
  }

  throw lastError || new Error("All AI providers failed");
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
      hashtags: ["quiniela", "predicciones", "ia"],
      cta: "Visitalo ahora",
    };
  }
}
