import { NextRequest, NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai/provider";
import { wrapProviderWithCostTracking, getTodayCost } from "@/lib/ai/cost-tracker";
import { checkPublicationSafety } from "@/lib/ai/publication-safety";

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

function generateTemplateCalendar(input: CampaignInput): CalendarSlot[] {
  const days = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];
  const hooks = [
    `Sabias que el ${80}% de los que juegan quiniela pierden por falta de estrategia?`,
    `Te voy a revelar el metodo que uso para analizar la quiniela con IA`,
    `No es suerte. Es matematica. Asi analizo los numeros con inteligencia artificial`,
    `Si todavia no usas IA para la quiniela, estas dejando plata sobre la mesa`,
    `La quiniela no se predice. Se analiza. Y la IA es tu mejor herramienta`,
    `3 errores que cometen todos los que juegan quiniela (y como la IA los corrige)`,
    `Transforma tu forma de jugar quiniela con este metodo basado en datos`,
  ];
  const captions = [
    `La quiniela no es solo suerte. Es analisis.\n\nCon inteligencia artificial, puedo estudiar patrones, tendencias y estadisticas que el ojo humano no ve.\n\n Asi es como me acerco a los aciertos, paso a paso.\n\nQueres ver como funciona? Link en bio.`,
    `Cada numero tiene una historia. La IA la lee.\n\nNo adivino. Analizo. Los datos son los que mandan.\n\nSi queres dejar de jugar a ciegas, esta es tu oportunidad.\n\nDescubi mi metodo → link en bio.`,
    `El ${90}% de los jugadores pierden. Yo estoy en el otro ${10}%.\n\nLa diferencia? Uso inteligencia artificial para analizar cada jugada.\n\nNo es magia. Es estrategia.\n\nUnite a los que juegan distinto.`,
    `Pensa la quiniela como un inversor piensa la bolsa.\n\nDatos. Tendencias. Analisis. Y un toque de IA.\n\nAsi genero mis predicciones todas las semanas.\n\nQueres probar? Link en bio.`,
    `Hoy te muestro como la IA cambio mi forma de jugar quiniela.\n\nAntes: intuicion.\n Ahora: datos + IA = mejores resultados.\n\nEl futuro de la quiniela es inteligente.`,
    `No necesitas ser matematico para ganar en quiniela.\n\nNecesitas la herramienta correcta. Y la IA es esa herramienta.\n\nAnalizo patrones, detecto tendencias y te doy los numeros mas probables.`,
    `Cada semana mejoro mi metodo. Gracias a la IA.\n\nLos datos no mienten. Y la inteligencia artificial los interpreta mejor que nadie.\n\nQueres ver los resultados? Segui mi perfil.`,
  ];
  const ctas = ["Link en bio", "Segui para mas", "Comenta QUINIELA", "DM para info", "Unite al grupo", "Probalo gratis", "Deja tu like"];
  const hashtagsPool = ["#quiniela", "#quinielaia", "#prediccionquiniela", "#inteligenciaartificial", "#numeros", "#quinielaargentina", "#analisisquiniela", "#quinielapredictor", "#apuestas", "#estrategiaquiniela", "#quinielagratis", "#quinielahoy", "#ia", "#machinelearning", "#datos"];

  const platformTypes: Record<string, string[]> = {
    instagram: ["reel", "carousel", "post", "story"],
    tiktok: ["video", "video", "video"],
  };

  return Array.from({ length: 7 }, (_, i) => {
    const platform = input.platforms[i % input.platforms.length] || "instagram";
    const types = platformTypes[platform] || ["post"];
    const type = types[i % types.length];
    const funnelStages = ["awareness", "awareness", "interest", "interest", "consideration", "conversion", "retention"];
    const stage = funnelStages[i];
    const selectedHashtags = hashtagsPool.sort(() => Math.random() - 0.5).slice(0, 10);

    return {
      day: i + 1,
      platform,
      type,
      hook: hooks[i % hooks.length],
      angle: ["problem", "solution", "curiosity", "education", "benefit", "authority", "offer"][i % 7],
      copy: captions[i % captions.length],
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
    const result = await provider.generateText({
      prompt: `Generá un caption corto para ${slot.platform} sobre quiniela e IA. Hook: "${slot.hook}". Negocio: ${input.businessName}. Respondé JSON: { "hook": "...", "caption": "...", "hashtags": ["#tag1"] }`,
      system_prompt: "Sos un copywriter experto. Español rioplatense. JSON válido.",
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
    let provider = null;
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

    const pieces = [];
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

      existingFingerprints.push(`${slot.platform}:${slot.hook.split(" ").slice(0, 5).join(":")}`);
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
          contentPillars: [{ name: "Quiniela + IA", type: "educational", percentage: 100 }],
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



