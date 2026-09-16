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
  const hookTemplates = [
    `¿Sabías que el ${80}% de los negocios pierden clientes por no tener presencia en redes?`,
    `Te voy a revelar el método que uso para atraer clientes con contenido auténtico`,
    `No es suerte. Es estrategia. Así genero demanda real para negocios`,
    `Si todavía no usás redes sociales para tu negocio, estás dejando plata sobre la mesa`,
    `El secreto que separa a los negocios que crecen de los que se estancan`,
    `3 errores que cometen todos los negocios en redes (y cómo evitarlos)`,
    `Transformá tu negocio con este método basado en datos y contenido auténtico`,
  ];
  const captionTemplates = [
    `El éxito no es solo suerte. Es estrategia.\n\nCon el contenido correcto, puedo atraer clientes que realmente necesitan tu producto o servicio.\n\nAsí es como genero demanda, paso a paso.\n\n¿Querés ver cómo funciona? Link en bio.`,
    `Cada negocio tiene una historia. Tu contenido la cuenta.\n\nNo adivino. Creo contenido que conecta. Los datos son los que mandan.\n\nSi querés dejar de depender del boca a boca, esta es tu oportunidad.\n\nDescubrí mi método → link en bio.`,
    `El ${90}% de los negocios pierden oportunidades en redes. Yo estoy en el otro ${10}%.\n\nLa diferencia? Creo contenido auténtico que genera confianza.\n\nNo es magia. Es estrategia.\n\nUnite a los que crecen distinto.`,
    `Pensá tu negocio como un inversor piensa la inversión.\n\nDatos. Tendencias. Estrategia. Y contenido auténtico.\n\nAsí genero clientes todas las semanas.\n\n¿Querés probar? Link en bio.`,
    `Hoy te muestro cómo el contenido cambió mi forma de crecer.\n\nAntes: esperanza.\nAhora: datos + contenido = resultados.\n\nEl futuro de tu negocio es inteligente.`,
    `No necesitas ser experto para crecer en redes.\n\nNecesitás la estrategia correcta. Y el contenido es esa herramienta.\n\nAnalizo tendencias, detecto lo que funciona y te doy los mejores resultados.`,
    `Cada semana mejoro mi método. Gracias a la estrategia.\n\nLos datos no mienten. Y el contenido auténtico conecta mejor que cualquier anuncio.\n\n¿Querés ver los resultados? Seguí mi perfil.`,
  ];
  const ctas = ["Link en bio", "Seguí para más", "Comentá tu opinión", "DM para info", "Unite al grupo", "Probalo gratis", "Dejá tu like"];
  const hashtagPool = ["#marketing", "#redessociales", "#negocios", "#emprendedores", "#contenido", "#estrategia", "#marketingdigital", "#crecimiento", "#clientes", "#branding", "#socialmedia", "#emprendimiento", "#venderonline", "#negociosdigitales", "#éxito"];

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
    const result = await provider.generateText({
      prompt: `Generá un contenido corto para ${slot.platform} sobre: ${input.businessName} - ${input.description}. Hook: "${slot.hook}". Objetivo: ${input.objective}. Respondé JSON: { "hook": "...", "caption": "...", "hashtags": ["#tag1"] }`,
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



