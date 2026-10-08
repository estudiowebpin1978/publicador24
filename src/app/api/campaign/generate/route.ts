import { NextRequest, NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai/provider";
import { wrapProviderWithCostTracking, getTodayCost } from "@/lib/ai/cost-tracker";
import { checkPublicationSafety } from "@/lib/ai/publication-safety";
import { COPYWRITER_SYSTEM, getSiteUrl } from "@/lib/ai/copywriter";

interface CampaignInput {
  businessName: string;
  website?: string;
  description: string;
  city?: string;
  objective: string;
  budget?: string;
  platforms: string[];
  frequency?: string;
}

interface CalendarSlot {
  day: number;
  platform: string;
  type: string;
  hook: string;
  angle: string;
  copy: string;
  cta: string;
  hashtags: string[];
  funnelStage: string;
  visualStyle: string;
}

/** Slot del calendario + contenido generado + resultado de safety */
interface GeneratedPiece extends CalendarSlot {
  generatedContent: { hook: string; caption: string; hashtags: string[]; cta: string };
  safetyCheck: { approved: boolean; score: number; reason?: string };
}

const STOPWORDS = new Set([
  "para", "como", "más", "mas", "este", "esta", "esto", "ese", "esa", "eso", "con",
  "por", "una", "uno", "unos", "unas", "del", "los", "las", "que", "desde", "hacia",
  "sobre", "entre", "muy", "también", "tambien", "cuando", "donde", "dónde", "qué",
  "cómo", "servicios", "servicio", "negocio", "negocios", "empresa", "empresas",
]);

/** Palabras clave del nicho, para hashtags y copy que tengan que ver con lo pedido. */
function nicheKeywords(text: string, max: number): string[] {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 5 && !STOPWORDS.has(w))
    .slice(0, max);
}

function generateTemplateCalendar(input: CampaignInput): CalendarSlot[] {
  const site = getSiteUrl({ url: input.website });
  const business = input.businessName.trim();
  const desc = (input.description || "").trim();
  const descShort = desc.length > 140 ? `${desc.slice(0, 137).trimEnd()}…` : desc;
  const goal = (input.objective || "").trim();

  // Respaldo cuando la IA no responde: siempre habla del negocio pedido,
  // nunca de un nicho genérico, y siempre lleva al sitio.
  const hookTemplates = [
    `${business}: lo que casi nadie te cuenta antes de empezar.`,
    `¿Viste cómo ${business} resuelve algo que a vos te jode hace meses?`,
    `Esto es lo que nadie te dice sobre ${descShort.split(/[.,;]/)[0].toLowerCase()}.`,
    `Si todavía no probaste esto, te falta un detalle — no suerte.`,
    `La razón por la que ${business} no depende del boca a boca.`,
    `Tres errores tontos que se cometen acá (y te hacen perder plata).`,
    `Lo probé, lo comparé y me quedé con esto. Acá te cuento por qué.`,
  ];
  const captionTemplates = [
    `Corto y claro: ${descShort}\n\nNo es magia, es hacer las cosas bien y de forma consistente.\n\nMirá cómo se ve en ${site}.`,
    `Lo que buscaba era simple: algo que funcione sin vueltas.\n\n${descShort}\n\nSi te sirve, entrá a ${site} y fijate vos.`,
    `Nadie te va a avisar cuando algo te está costando plata.\n\n${descShort}\n\nPor eso lo miro siempre desde ${site}.`,
    `Antes hacía esto a mano y perdía horas.\n\n${descShort}\n\nLo dejé de lado y no volví atrás. Detalles en ${site}.`,
    `La pregunta no es si lo necesitás, sino cuándo te vas a dar cuenta.\n\n${descShort}\n\nMirá el paso a paso en ${site}.`,
    `Probé un montón de opciones y casi todas eran lo mismo con otro nombre.\n\n${descShort}\n\nEste fue el que me quedó. Info en ${site}.`,
    `Si te quedaste con la duda, hacé la prueba vos:\n\n${descShort}\n\nEntrá a ${site} y contame qué te pareció.`,
  ];
  const ctas = [
    `Mirá más en ${site}`,
    `Entrá a ${site}`,
    `Probalo en ${site}`,
    `Comentá qué te pareció`,
    `DM si te queda alguna duda`,
    `Guardalo para después`,
    `Pasalo a alguien que lo necesite`,
  ];
  const tagWords = nicheKeywords(`${desc} ${business}`, 12);
  const hashtagPool = [
    ...tagWords.map((w) => `#${w}`),
    "#argentina",
    "#recomendacion",
    "#tips",
    "#producto",
    "#servicio",
    "#hoy",
  ];

  const platformTypes: Record<string, string[]> = {
    instagram: ["reel", "carousel", "post", "story"],
    tiktok: ["video", "video", "video"],
    facebook: ["post", "video", "story"],
    linkedin: ["article", "post", "video"],
  };

  return Array.from({ length: 7 }, (_, i) => {
    const platform = input.platforms[i % input.platforms.length] || "instagram";
    const types = platformTypes[platform] || ["post"];
    const type = types[i % types.length];
    const funnelStages = ["awareness", "awareness", "interest", "interest", "consideration", "conversion", "retention"];
    const stage = funnelStages[i];
    const selectedHashtags = hashtagPool.sort(() => Math.random() - 0.5).slice(0, 10);

    return {
      day: i + 1,
      platform,
      type,
      hook: hookTemplates[i % hookTemplates.length],
      angle: ["problem", "solution", "curiosity", "education", "benefit", "authority", "offer"][i % 7],
      copy: captionTemplates[i % captionTemplates.length],
      cta: ctas[i % ctas.length],
      hashtags: selectedHashtags,
      funnelStage: stage,
      visualStyle: ["modern", "lifestyle", "minimalist", "editorial", "product", "realistic", "bold"][i % 7],
    };
  });
}

async function tryAIAnalysis(input: CampaignInput, provider: ReturnType<typeof getAIProvider>) {
  try {
    const audienceResult = await provider.generateText({
      prompt: `Describe la audiencia ideal para: ${input.businessName} - ${input.description}. Respondé JSON: { "primary": { "description": "...", "demographics": "..." } }`,
      system_prompt: "Sos un experto en marketing. Respondé JSON válido.",
      max_tokens: 500,
    });
    const match = audienceResult.text.match(/```json\s*([\s\S]*?)```/);
    return JSON.parse(match ? match[1] : audienceResult.text);
  } catch {
    return { primary: { description: input.description, demographics: "General", confidence: 50 } };
  }
}

async function tryAIGeneratePiece(slot: CalendarSlot, input: CampaignInput, provider: ReturnType<typeof getAIProvider>) {
  try {
    const site = getSiteUrl({ url: input.website });
    const result = await provider.generateText({
      prompt: `Generá el contenido de un día del calendario para ${slot.platform}.

CONTEXTO
- Negocio: ${input.businessName}
- De qué se trata: ${input.description}
- Objetivo de la campaña: ${input.objective}
- Sitio web (CTA obligatoria): ${site}
- Etapa del embudo: ${slot.funnelStage}
- Ángulo del post: ${slot.angle}
- Gancho sugerido (podés mejorarlo): "${slot.hook}"

REGLAS (obligatorias)
- Español rioplatense, tono de persona real: frases cortas y largas, sin relleno.
- Nada de estructura de nota ni de IA: prohibido "En este post", "descubrí el poder de", listas genéricas de beneficios y promesas de resultados garantizados.
- Que tenga que ver con el negocio descrito, no con un nicho genérico.
- Cerrá con una invitación concreta a entrar a ${site}, con un motivo real para el lector.
- Primera línea que frene el scroll.

Respondé SOLO JSON: { "hook": "...", "caption": "...", "hashtags": ["#tag1"] }`,
      system_prompt: COPYWRITER_SYSTEM,
      max_tokens: 600,
    });
    const match = result.text.match(/```json\s*([\s\S]*?)```/);
    return JSON.parse(match ? match[1] : result.text);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const input: CampaignInput = await request.json();

    if (!input.businessName?.trim()) {
      return NextResponse.json({ error: "Nombre del negocio requerido" }, { status: 400 });
    }
    if (!input.description?.trim()) {
      return NextResponse.json({ error: "Descripción del negocio requerida" }, { status: 400 });
    }
    if (!input.objective?.trim()) {
      return NextResponse.json({ error: "Objetivo requerido" }, { status: 400 });
    }
    if (!input.platforms?.length) {
      return NextResponse.json({ error: "Al menos una plataforma requerida" }, { status: 400 });
    }

    let aiAvailable = false;
    let provider: ReturnType<typeof getAIProvider> | null = null;
    try {
      const baseProvider = getAIProvider();
      provider = wrapProviderWithCostTracking(baseProvider, "openrouter");
      aiAvailable = true;
    } catch {
      aiAvailable = false;
    }

    const audiences = aiAvailable && provider ? await tryAIAnalysis(input, provider) : { primary: { description: input.description, demographics: "General", confidence: 50 } };

    const calendar = generateTemplateCalendar(input);

    if (aiAvailable && provider) {
      for (let i = 0; i < calendar.length; i++) {
        const aiContent = await tryAIGeneratePiece(calendar[i], input, provider);
        if (aiContent) {
          calendar[i].hook = aiContent.hook || calendar[i].hook;
          calendar[i].copy = aiContent.caption || calendar[i].copy;
          calendar[i].hashtags = aiContent.hashtags?.length ? aiContent.hashtags : calendar[i].hashtags;
        }
      }
    }

    const pieces: GeneratedPiece[] = [];
    const safetyResults: Array<{ pieceIndex: number; approved: boolean; reason?: string }> = [];
    const existingFingerprints: string[] = [];

    for (let i = 0; i < calendar.length; i++) {
      const slot = calendar[i];
      const safetyResult = await checkPublicationSafety(`piece-${i}`, slot.hook, slot.copy, slot.platform, existingFingerprints);

      safetyResults.push({ pieceIndex: i, approved: safetyResult.approved, reason: safetyResult.reason });

      pieces.push({
        ...slot,
        generatedContent: { hook: slot.hook, caption: slot.copy, hashtags: slot.hashtags, cta: slot.cta },
        safetyCheck: { approved: safetyResult.approved, score: safetyResult.safetyScore, reason: safetyResult.reason },
      });

      existingFingerprints.push(`${slot.hook} ${slot.copy}`);
    }

    const costSummary = getTodayCost();
    const approvedCount = safetyResults.filter((r) => r.approved).length;

    return NextResponse.json({
      success: true,
      campaign: {
        name: input.businessName,
        business: input,
        analysis: { audiences },
        strategy: {
          funnel: { awareness: 40, interest: 25, consideration: 20, conversion: 15, retention: 10 },
          contentPillars: [{ name: "Contenido del negocio", type: "educational", percentage: 100 }],
          kpiTargets: { reach: 10000, engagement: 500, clicks: 200, leads: 50 },
        },
        contentPieces: pieces,
        status: "generated",
        aiUsed: aiAvailable,
        safetySummary: {
          total: pieces.length,
          approved: approvedCount,
          blocked: pieces.length - approvedCount,
          details: safetyResults,
        },
        costSummary,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Campaign generation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Error al generar campaña", details: errorMessage }, { status: 500 });
  }
}



