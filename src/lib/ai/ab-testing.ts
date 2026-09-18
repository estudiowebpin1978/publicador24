import { generateTextWithFallback } from "@/lib/ai/multi-provider";

export interface ABVariant {
  id: string;
  hook: string;
  body: string;
  cta: string;
  hashtags: string[];
}

export interface ABTest {
  campaignId: string;
  platform: string;
  variants: [ABVariant, ABVariant];
  winningVariant?: string;
  metrics?: { impressions: number; clicks: number; ctr: number }[];
}

export async function generateABVariants(
  topic: string,
  platform: string,
  objective: string,
  audience: string
): Promise<ABTest> {
  const systemPrompt = `Sos un experto en copywriting A/B testing para redes sociales en español argentino (voseo). Generá DOS variantes de contenido con enfoques completamente distintos. Respondé SIEMPRE con JSON válido, sin texto adicional.`;

  const prompt = `Generá 2 variantes de contenido para A/B testing sobre: ${topic}

PLATAFORMA: ${platform}
OBJETIVO: ${objective}
PÚBLICO: ${audience}

VARIANT A (Hook emocional/urgencia):
- Enfoque en emociones, urgencia, fear of missing out
- Tono apasionado que genera reacción inmediata

VARIANT B (Hook curiosidad/datos):
- Enfoque en datos, estadísticas, curiosidad
- Tono informativo que genera interés por saber más

Para cada variante generá:
1. Hook (primera línea)
2. Body (cuerpo del post)
3. CTA (call to action)
4. 6 hashtags relevantes

Respondé con JSON:
{
  "variants": [
    {
      "id": "A",
      "hook": "...",
      "body": "...",
      "cta": "...",
      "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6"]
    },
    {
      "id": "B",
      "hook": "...",
      "body": "...",
      "cta": "...",
      "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6"]
    }
  ]
}`;

  const result = await generateTextWithFallback(prompt, systemPrompt);

  try {
    const match = result.text.match(/```json\s*([\s\S]*?)```/);
    const jsonStr = match ? match[1] : result.text;
    const parsed = JSON.parse(jsonStr.trim());
    const variants = parsed.variants || parsed;

    const fallbackA: ABVariant = {
      id: "A",
      hook: result.text.substring(0, 100),
      body: result.text,
      cta: "Visitalo ahora",
      hashtags: [],
    };

    const fallbackB: ABVariant = {
      id: "B",
      hook: result.text.substring(100, 200) || result.text.substring(0, 100),
      body: result.text,
      cta: "Descubrí más",
      hashtags: [],
    };

    if (Array.isArray(variants) && variants.length >= 2) {
      return {
        campaignId: "",
        platform,
        variants: [
          {
            id: "A",
            hook: variants[0].hook || "",
            body: variants[0].body || variants[0].caption || "",
            cta: variants[0].cta || "",
            hashtags: variants[0].hashtags || [],
          },
          {
            id: "B",
            hook: variants[1].hook || "",
            body: variants[1].body || variants[1].caption || "",
            cta: variants[1].cta || "",
            hashtags: variants[1].hashtags || [],
          },
        ],
      };
    }

    return {
      campaignId: "",
      platform,
      variants: [fallbackA, fallbackB],
    };
  } catch {
    return {
      campaignId: "",
      platform,
      variants: [
        {
          id: "A",
          hook: result.text.substring(0, 100),
          body: result.text,
          cta: "Visitalo ahora",
          hashtags: [],
        },
        {
          id: "B",
          hook: result.text.substring(100, 200) || result.text.substring(0, 100),
          body: result.text,
          cta: "Descubrí más",
          hashtags: [],
        },
      ],
    };
  }
}
