import { NextRequest, NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai/provider";

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

async function analyzeBusiness(input: CampaignInput, ai: ReturnType<typeof getAIProvider>) {
  let websiteAnalysis = null;
  if (input.website) {
    const result = await ai.generateText({
      prompt: `Analizá el sitio web ${input.website} y extraé: tipo de negocio, servicios/productos, público, CTAs, contacto. Respondé con JSON: { "businessType": "...", "offerings": [...], "targetAudience": "...", "contactChannels": [...], "keyPages": [...], "brandTone": "..." }`,
      system_prompt: "Sos un experto en análisis web. Respondé con JSON válido.",
      max_tokens: 1500,
    });
    try {
      const match = result.text.match(/```json\s*([\s\S]*?)```/);
      websiteAnalysis = JSON.parse(match ? match[1] : result.text);
    } catch { /* fallback */ }
  }

  const audienceResult = await ai.generateText({
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
    max_tokens: 2000,
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
  ai: ReturnType<typeof getAIProvider>
) {
  const result = await ai.generateText({
    prompt: `Creá una estrategia COMPLETA de marketing para:

NEGOCIO: ${input.businessName}
DESCRIPCIÓN: ${input.description}
${input.city ? `CIUDAD: ${input.city}` : ""}
OBJETIVO: ${input.objective}
PLATAFORMAS: ${input.platforms.join(", ")}
${input.budget ? `PRESUPUESTO: ${input.budget}` : ""}
FRECUENCIA: ${input.frequency || "diaria"}
AUDIENCIA PRINCIPAL: ${(businessAnalysis.audiences as Record<string, unknown>)?.primary ? JSON.stringify((businessAnalysis.audiences as Record<string, unknown>).primary) : "No definida"}

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
    max_tokens: 6000,
  });

  try {
    const match = result.text.match(/```json\s*([\s\S]*?)```/);
    return JSON.parse(match ? match[1] : result.text);
  } catch {
    return { error: "Estrategia generada parcialmente", raw: result.text };
  }
}

async function generateContentPieces(
  strategy: Record<string, unknown>,
  input: CampaignInput,
  ai: ReturnType<typeof getAIProvider>
) {
  const calendar = (strategy.contentCalendar || []) as Array<Record<string, unknown>>;
  const pieces = [];

  for (const slot of calendar.slice(0, 14)) {
    const result = await ai.generateText({
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
      max_tokens: 2000,
    });

    try {
      const match = result.text.match(/```json\s*([\s\S]*?)```/);
      const content = JSON.parse(match ? match[1] : result.text);
      pieces.push({
        ...slot,
        generatedContent: content,
      });
    } catch {
      pieces.push({
        ...slot,
        generatedContent: { hook: slot.hook, caption: slot.copy, hashtags: [], cta: slot.cta },
      });
    }
  }

  return pieces;
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

    const ai = getAIProvider();

    const businessAnalysis = await analyzeBusiness(input, ai);
    const strategy = await generateFullStrategy(input, businessAnalysis, ai);
    const contentPieces = await generateContentPieces(strategy, input, ai);

    return NextResponse.json({
      success: true,
      campaign: {
        name: input.businessName,
        business: input,
        analysis: businessAnalysis,
        strategy,
        contentPieces,
        status: "generated",
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Campaign generation error:", error);
    return NextResponse.json(
      { error: "Error al generar campaña", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
