import { NextRequest, NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai/provider";
import { wrapProviderWithCostTracking, getTodayCost } from "@/lib/ai/cost-tracker";
import { readStrategyMemory, writeStrategyMemory } from "@/lib/ai/strategy-memory";
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

const STRATEGY_SYSTEM_PROMPT = `Sos un estratega de marketing digital de nivel mundial. Tu objetivo es crear campañas que GENEREN DEMANDA REAL: atraer personas, llevarlas a la web, generar interés y conseguir prospectos.

REGLAS:
1. Pensá como un CMO experimentado, no como un generador de posts
2. Cada decisión debe estar justificada por datos o experiencia
3. El objetivo final es GENERAR PROSPECTOS, no solo engagement
4. La diversidad de contenido es CRÍTICA - nunca repetir formato/ángulo consecutivamente
5. Cada plataforma tiene reglas diferentes - adaptá, no copies
6. El funnel debe ser dinámico según resultados
7. Separa HECHOS VERIFICADOS de SUPPOSICIONES DE LA IA
8. Usá español rioplatense (voseo)
9. Respondé SIEMPRE con JSON válido, sin texto adicional`;

async function analyzeBusiness(input: CampaignInput, provider: ReturnType<typeof getAIProvider>) {
  let websiteAnalysis = null;
  if (input.website) {
    const result = await provider.generateText({
      prompt: `Analizá el sitio web ${input.website} y extraé: tipo de negocio, servicios/productos, público, CTAs, contacto. Respondé con JSON: { "businessType": "...", "offerings": [...], "targetAudience": "...", "contactChannels": [...], "keyPages": [...], "brandTone": "..." }`,
      system_prompt: "Sos un experto en análisis web. Respondé con JSON válido.",
      max_tokens: 800,
    });
    try {
      const match = result.text.match(/```json\s*([\s\S]*?)```/);
      websiteAnalysis = JSON.parse(match ? match[1] : result.text);
    } catch { /* fallback */ }
  }

  const audienceResult = await provider.generateText({
    prompt: `Con esta información de negocio, descubrí las audiencias:
NEGOCIO: ${input.businessName}
DESCRIPCIÓN: ${input.description}
${input.city ? `CIUDAD: ${input.city}` : ""}
OBJETIVO: ${input.objective}
${websiteAnalysis ? `ANÁLISIS WEB: ${JSON.stringify(websiteAnalysis)}` : ""}

Respondé con JSON:
{
  "primary": { "description": "...", "demographics": "...", "painPoints": ["..."], "desires": ["..."], "whereToReach": ["..."], "confidence": 0-100 },
  "secondary": { "description": "...", "demographics": "...", "painPoints": ["..."], "desires": ["..."], "whereToReach": ["..."], "confidence": 0-100 },
  "testAudiences": [{ "description": "...", "hypothesis": "...", "confidence": 0-100 }]
}`,
    system_prompt: "Sos un experto en segmentación de audiencia. Respondé con JSON válido.",
    max_tokens: 1200,
  });

  let audiences;
  try {
    const match = audienceResult.text.match(/```json\s*([\s\S]*?)```/);
    audiences = JSON.parse(match ? match[1] : audienceResult.text);
  } catch {
    audiences = { primary: { description: input.description, confidence: 50 } };
  }

  return { websiteAnalysis, audiences };
}

async function generateFullStrategy(
  input: CampaignInput,
  businessAnalysis: { websiteAnalysis: unknown; audiences: unknown },
  memoryHook: string[],
  provider: ReturnType<typeof getAIProvider>
) {
  const memoryContext = memoryHook.length > 0
    ? `\nMEMORIA DE CAMPAÑA (hooks previos que funcionaron): ${memoryHook.slice(0, 5).join('; ')}\nEvitá repetir estos hooks. Generá ángulos nuevos.`
    : '';

  const result = await provider.generateText({
    prompt: `Creá una estrategia COMPLETA de marketing para:

NEGOCIO: ${input.businessName}
DESCRIPCIÓN: ${input.description}
${input.city ? `CIUDAD: ${input.city}` : ""}
OBJETIVO: ${input.objective}
PLATAFORMAS: ${input.platforms.join(", ")}
${input.budget ? `PRESUPUESTO: ${input.budget}` : ""}
FRECUENCIA: ${input.frequency || "diaria"}
AUDIENCIA PRINCIPAL: ${(businessAnalysis.audiences as Record<string, unknown>)?.primary ? JSON.stringify((businessAnalysis.audiences as Record<string, unknown>).primary) : "No definida"}${memoryContext}

Respondé con JSON:
{
  "funnel": { "awareness": N, "interest": N, "consideration": N, "conversion": N, "retention": N },
  "contentPillars": [
    { "name": "nombre", "type": "educational|promotional|entertainment|authority|social_proof", "percentage": N, "description": "...", "examples": ["ejemplo1"] }
  ],
  "contentCalendar": [
    { "day": 1, "platform": "instagram", "type": "reel|carousel|story|post|video", "hook": "...", "angle": "problem|solution|benefit|curiosity|education|comparison|authority|offer", "copy": "...", "cta": "...", "hashtags": ["#tag1"], "funnelStage": "awareness|interest|consideration|conversion|retention", "visualStyle": "realistic|minimalist|lifestyle|product|editorial" }
  ],
  "ctaStrategy": { "awareness": "...", "interest": "...", "consideration": "...", "conversion": "...", "retention": "..." },
  "landingPages": [{ "campaign": "...", "url": "...", "reason": "..." }],
  "budgetAllocation": { "awareness": N, "interest": N, "consideration": N, "conversion": N },
  "riskAssessment": ["riesgo1", "riesgo2"],
  "recommendations": ["rec1", "rec2"],
  "kpiTargets": { "reach": N, "engagement": N, "clicks": N, "leads": N }
}`,
    system_prompt: STRATEGY_SYSTEM_PROMPT,
    max_tokens: 1500,
  });

  try {
    let jsonStr = result.text;
    const mdMatch = result.text.match(/```json\s*([\s\S]*?)```/);
    if (mdMatch) {
      jsonStr = mdMatch[1];
    } else {
      const firstBrace = result.text.indexOf('{');
      const lastBrace = result.text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        jsonStr = result.text.substring(firstBrace, lastBrace + 1);
      }
    }
    return JSON.parse(jsonStr.trim());
  } catch {
    return {
      funnel: { awareness: 40, interest: 25, consideration: 20, conversion: 15, retention: 10 },
      contentPillars: [{ name: "General", type: "promotional", percentage: 100, description: "Contenido general", examples: [] }],
      contentCalendar: Array.from({ length: 7 }, (_, i) => ({
        day: i + 1,
        platform: input.platforms[i % input.platforms.length] || "instagram",
        type: i % 2 === 0 ? "reel" : "post",
        hook: `Hook día ${i + 1} para ${input.businessName}`,
        angle: "curiosity",
        copy: `Contenido promocional para ${input.businessName} - día ${i + 1}`,
        cta: "Visitá nuestra web",
        hashtags: ["#marketing", "#publicidad"],
        funnelStage: i < 3 ? "awareness" : i < 5 ? "interest" : "conversion",
        visualStyle: "modern",
      })),
      ctaStrategy: { awareness: "Descubrí más", interest: "Conocé la solución", consideration: "Probá gratis", conversion: "Registrate ahora", retention: "Compartí con amigos" },
      landingPages: [],
      budgetAllocation: { awareness: 40, interest: 25, consideration: 20, conversion: 15 },
      riskAssessment: [],
      recommendations: ["Generar contenido variado", "Medir resultados semanalmente"],
      kpiTargets: { reach: 10000, engagement: 500, clicks: 200, leads: 50 },
    };
  }
}

async function generateContentPieces(
  strategy: Record<string, unknown>,
  input: CampaignInput,
  existingFingerprints: string[],
  provider: ReturnType<typeof getAIProvider>
) {
  const calendar = (strategy.contentCalendar || []) as Array<Record<string, unknown>>;
  const pieces = [];
  const safetyResults: Array<{ pieceIndex: number; approved: boolean; reason?: string }> = [];

  for (let i = 0; i < Math.min(calendar.length, 7); i++) {
    const slot = calendar[i];
    const result = await provider.generateText({
      prompt: `Generá contenido para esta publicación:

PLATAFORMA: ${slot.platform}
TIPO: ${slot.type}
HOOK: ${slot.hook}
ÁNGULO: ${slot.angle}
FUNNEL: ${slot.funnelStage}
NEGOCIO: ${input.businessName}
OBJETIVO: ${input.objective}

Generá:
1. Hook principal (primera línea que engancha)
2. Caption completo (con storytelling, benefits, y CTA)
3. 10 hashtags relevantes
4. CTA específico para esta etapa del funnel
5. Variante A/B del hook
6. Variante A/B del caption

Respondé con JSON:
{
  "hook": "...",
  "caption": "...",
  "hashtags": ["#tag1", "#tag2"],
  "cta": "...",
  "variantA": { "hook": "...", "caption": "..." },
  "variantB": { "hook": "...", "caption": "..." },
  "imagePrompt": "prompt detallado para generar imagen",
  "platformNotes": "adaptaciones específicas para esta plataforma"
}`,
      system_prompt: "Sos un experto en copywriting y contenido para redes sociales. Creá contenido que GENERE DEMANDA, no solo engagement. Respondé con JSON válido.",
    max_tokens: 1200,
    });

    let generatedContent: Record<string, unknown>;
    try {
      const match = result.text.match(/```json\s*([\s\S]*?)```/);
      generatedContent = JSON.parse(match ? match[1] : result.text);
    } catch {
      generatedContent = { hook: slot.hook, caption: slot.copy, hashtags: [], cta: slot.cta };
    }

    const hook = String(generatedContent.hook || '');
    const caption = String(generatedContent.caption || '');
    const platform = String(slot.platform || 'instagram');

    const safetyResult = await checkPublicationSafety(
      `temp-${i}`,
      hook,
      caption,
      platform,
      existingFingerprints
    );

    safetyResults.push({
      pieceIndex: i,
      approved: safetyResult.approved,
      reason: safetyResult.reason,
    });

    if (safetyResult.approved) {
      await writeStrategyMemory({
        campaignId: "local",
        topic: input.businessName,
        hook,
        contentType: String(slot.type || 'post'),
        platform,
        funnelStage: String(slot.funnelStage || 'awareness'),
        score: safetyResult.safetyScore,
      });
    }

    pieces.push({
      ...slot,
      generatedContent,
      safetyCheck: {
        approved: safetyResult.approved,
        score: safetyResult.safetyScore,
        reason: safetyResult.reason,
      },
    });

    existingFingerprints.push(`${platform}:${hook.split(' ').slice(0, 5).join(':')}`);
  }

  return { pieces, safetyResults };
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

    const baseProvider = getAIProvider();
    const provider = wrapProviderWithCostTracking(baseProvider, "openrouter");

    let existingFingerprints: string[] = [];
    try {
      const memory = await readStrategyMemory("local");
      existingFingerprints = memory.hooks;
    } catch { /* first campaign */ }

    const businessAnalysis = await analyzeBusiness(input, provider);
    const strategy = await generateFullStrategy(input, businessAnalysis, existingFingerprints, provider);
    const { pieces: contentPieces, safetyResults } = await generateContentPieces(strategy, input, existingFingerprints, provider);

    const costSummary = getTodayCost();
    const approvedCount = safetyResults.filter(r => r.approved).length;
    const blockedCount = safetyResults.filter(r => !r.approved).length;

    return NextResponse.json({
      success: true,
      campaign: {
        name: input.businessName,
        business: input,
        analysis: businessAnalysis,
        strategy,
        contentPieces,
        status: "generated",
        safetySummary: {
          total: contentPieces.length,
          approved: approvedCount,
          blocked: blockedCount,
          details: safetyResults,
        },
        costSummary,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Campaign generation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isAIError = errorMessage.includes("NOT CONFIGURED") || errorMessage.includes("API_KEY");
    return NextResponse.json(
      {
        error: isAIError ? "AI PROVIDER NOT CONFIGURED" : "Error al generar campaña",
        details: errorMessage,
        hint: isAIError ? "Set OPENROUTER_API_KEY or GROQ_API_KEY in .env.local" : undefined,
      },
      { status: isAIError ? 503 : 500 }
    );
  }
}
