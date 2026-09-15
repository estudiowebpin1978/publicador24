import { NextRequest, NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai/provider";
import { wrapProviderWithCostTracking, getTodayCost } from "@/lib/ai/cost-tracker";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  message: string;
  history?: ChatMessage[];
  referenceImages?: string[];
  context?: {
    campaignId?: string;
    projectId?: string;
    mode?: "chat" | "campaign" | "website_analysis";
  };
}

const SYSTEM_PROMPT = `Sos Publicador24, un motor autónomo de marketing digital con inteligencia artificial.

Tu función principal es ayudar a crear campañas de marketing que generen demanda real: atraer personas, llevarlas a la web, generar interés y conseguir prospectos.

CAPACIDADES:
1. Analizar negocios y sitios web
2. Descubrir audiencias automáticamente
3. Crear estrategias de marketing completas
4. Generar contenido variado para todas las plataformas
5. Programar y publicar automáticamente
6. Medir resultados y aprender
7. Optimizar continuamente

CUANDO UN USUARIO TE DESCRIBE UN NEGOCIO:
- Analizá qué vende, a quién le vende, y cuál es su objetivo
- Identificá el tipo de negocio (ecommerce, servicios, local, B2B, etc.)
- Inferí la audiencia primaria y secundaria
- Proponé una estrategia con funnel completo
- Sugerí contenido concretos con hooks, copies y CTAs

CUANDO UN USUARIO PEGUE UNA URL:
- Pedile permiso para analizarla
- Identificá: tipo de negocio, servicios/productos, público, CTAs, contacto
- Extraé información verificable vs suposiciones de la IA

FORMATO DE RESPUESTA:
- Usá español rioplatense (voseo)
- Sé conciso y directo
- Cuando generes contenido, incluí hooks, captions, hashtags y CTAs
- Siempre pensá en el objetivo de GENERAR DEMANDA, no solo contenido

IMPORTANTE:
- No inventes información que no tengas confirmada
- Separa HECHOS VERIFICADOS de SUPPOSICIONES DE LA IA
- Si falta información clave, preguntala antes de asumir
- El objetivo final es GENERAR PROSPECTOS, no solo likes`;

async function analyzeWebsite(url: string, provider: ReturnType<typeof getAIProvider>) {
  const prompt = `Analizá el siguiente sitio web y extraé información clave. NO inventes información.

URL: ${url}

Respondé con JSON:
{
  "businessName": "nombre del negocio si es visible",
  "businessType": "ecommerce|services|local|saas|education|health|real_estate|food|other",
  "offerings": ["producto/servicio1", "producto/servicio2"],
  "targetAudience": "audiencia principal inferida",
  "location": "ubicación si es visible",
  "contactChannels": ["email|whatsapp|phone|form"],
  "keyPages": ["página1", "página2"],
  "ctaFound": ["CTA encontrado1", "CTA encontrado2"],
  "brandTone": "tono de la marca inferido",
  "confidence": 0-100,
  "verifiedFacts": ["hecho verificable1", "hecho verificable2"],
  "assumptions": ["suposición1", "suposición2"]
}`;

  const result = await provider.generateText({
    prompt,
    system_prompt: "Sos un experto en análisis de sitios web y negocios digitales. Respondé SIEMPRE con JSON válido.",
    max_tokens: 1500,
  });

  try {
    const match = result.text.match(/```json\s*([\s\S]*?)```/);
    const jsonStr = match ? match[1] : result.text;
    return JSON.parse(jsonStr.trim());
  } catch {
    return { error: "No se pudo analizar el sitio", raw: result.text };
  }
}

async function discoverAudience(businessInfo: string, provider: ReturnType<typeof getAIProvider>) {
  const prompt = `Con la siguiente información de negocio, descubrí las audiencias posibles.

Negocio: ${businessInfo}

Respondé con JSON:
{
  "primary": {
    "description": "descripción de la audiencia principal",
    "demographics": "rango de edad, género, ubicación",
    "psychographics": "intereses, valores, comportamiento",
    "painPoints": ["problema1", "problema2"],
    "desires": ["deseo1", "deseo2"],
    "whereToReach": ["plataforma1", "plataforma2"],
    "confidence": 0-100
  },
  "secondary": {
    "description": "audiencia secundaria",
    "demographics": "...",
    "psychographics": "...",
    "painPoints": ["..."],
    "desires": ["..."],
    "whereToReach": ["..."],
    "confidence": 0-100
  },
  "testAudiences": [
    {
      "description": "audiencia de prueba 1",
      "hypothesis": "por qué podría funcionar",
      "confidence": 0-100
    }
  ]
}`;

  const result = await provider.generateText({
    prompt,
    system_prompt: "Sos un experto en segmentación de audiencia y marketing digital. Respondé SIEMPRE con JSON válido.",
    max_tokens: 2000,
  });

  try {
    const match = result.text.match(/```json\s*([\s\S]*?)```/);
    const jsonStr = match ? match[1] : result.text;
    return JSON.parse(jsonStr.trim());
  } catch {
    return { error: "No se pudo descubrir audiencia", raw: result.text };
  }
}

async function generateStrategy(input: {
  business: string;
  objective: string;
  audience: string;
  platforms: string[];
  budget?: string;
  provider: ReturnType<typeof getAIProvider>;
}) {
  const prompt = `Creá una estrategia de marketing completa para:

NEGOCIO: ${input.business}
OBJETIVO: ${input.objective}
AUDIENCIA: ${input.audience}
PLATAFORMAS: ${input.platforms.join(", ")}
${input.budget ? `PRESUPUESTO: ${input.budget}` : ""}

La estrategia debe incluir:

1. FUNNEL (distribución de contenido):
   - Porcentajes para cada etapa: AWARENESS, INTEREST, CONSIDERATION, CONVERSION, RETENTION
   - Justificación de los porcentajes

2. CONTENT PILLARS (3-5 pilares de contenido):
   - Nombre del pilar
   - Tipo de contenido
   - Objetivo del pilar
   - Ejemplo de post

3. CONTENT PLAN (primeras 2 semanas):
   - Para cada día: plataforma, tipo de contenido, hook, ángulo, CTA
   - Mantener diversidad (no repetir formato/ángulo consecutivamente)

4. CTA STRATEGY:
   - CTA principal por etapa del funnel
   - Landing page sugerida para cada tipo de contenido

5. BUDGET ALLOCATION:
   - Si hay presupuesto: distribución sugerida
   - Si no hay: estrategia orgánica

Respondé con JSON:
{
  "funnel": { "awareness": 40, "interest": 25, "consideration": 20, "conversion": 15, "retention": 10 },
  "pillars": [{ "name": "...", "type": "...", "objective": "...", "example": "..." }],
  "calendar": [{ "day": 1, "platform": "...", "type": "...", "hook": "...", "angle": "...", "cta": "..." }],
  "ctaStrategy": { "awareness": "...", "interest": "...", "consideration": "...", "conversion": "...", "local": "..." },
  "budgetAllocation": { "ads": 60, "content": 25, "tools": 15 },
  "recommendations": ["rec1", "rec2"]
}`;

  const result = await input.provider.generateText({
    prompt,
    system_prompt: "Sos un estratega de marketing digital experto. Respondé SIEMPRE con JSON válido. Usá español rioplatense.",
    max_tokens: 4000,
  });

  try {
    const match = result.text.match(/```json\s*([\s\S]*?)```/);
    const jsonStr = match ? match[1] : result.text;
    return JSON.parse(jsonStr.trim());
  } catch {
    return { error: "No se pudo generar estrategia", raw: result.text };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, history = [] } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: "Mensaje requerido" }, { status: 400 });
    }

    const baseProvider = getAIProvider();
    const provider = wrapProviderWithCostTracking(baseProvider, "openrouter");

    const isUrl = /https?:\/\/[^\s]+/.test(message);
    const isCampaignRequest = /campaña|campaign|quiero conseguir|necesito contenido|promocionar/i.test(message);
    const isWebsiteAnalysis = isUrl || /analizar|analizá|visitá|sitio web|web/i.test(message);

    let response = "";
    let data: Record<string, unknown> = {};

    if (isWebsiteAnalysis && isUrl) {
      const urlMatch = message.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        const websiteData = await analyzeWebsite(urlMatch[0], provider);
        data.websiteAnalysis = websiteData;
        response = `Analicé el sitio web. Esto es lo que encontré:\n\n**Negocio:** ${websiteData.businessName || "No identificado"}\n**Tipo:** ${websiteData.businessType || "No identificado"}\n**Ofertas:** ${(websiteData.offerings || []).join(", ") || "No identificadas"}\n**Público inferido:** ${websiteData.targetAudience || "No identificado"}\n**Contacto:** ${(websiteData.contactChannels || []).join(", ") || "No encontrado"}\n\n**Hechos verificados:**\n${(websiteData.verifiedFacts || []).map((f: string) => `- ${f}`).join("\n") || "- No se pudieron verificar"}\n\n**Suposiciones de la IA:**\n${(websiteData.assumptions || []).map((a: string) => `- ${a}`).join("\n") || "- Ninguna"}\n\n¿Querés que genere una campaña completa para este negocio? Decime el objetivo y las plataformas.`;
      }
    } else if (isCampaignRequest) {
      const audienceData = await discoverAudience(message, provider);
      data.audienceDiscovery = audienceData;

      const platforms = ["instagram", "facebook"];
      const strategyData = await generateStrategy({
        business: message,
        objective: "Conseguir clientes y prospectos",
        audience: audienceData.primary?.description || message,
        platforms,
        provider,
      });
      data.strategy = strategyData;

      response = `¡Perfecto! Generé una estrategia completa:\n\n**PÚBLICO DESCUBIERTO:**\n- Principal: ${audienceData.primary?.description || "Por definir"} (Confianza: ${audienceData.primary?.confidence || 0}%)\n- Secundario: ${audienceData.secondary?.description || "Por definir"} (Confianza: ${audienceData.secondary?.confidence || 0}%)\n\n**ESTRATEGIA:**\n- Awareness: ${strategyData.funnel?.awareness || 40}%\n- Interest: ${strategyData.funnel?.interest || 25}%\n- Consideration: ${strategyData.funnel?.consideration || 20}%\n- Conversion: ${strategyData.funnel?.conversion || 15}%\n- Retention: ${strategyData.funnel?.retention || 10}%\n\n**PILARES DE CONTENIDO:**\n${(strategyData.pillars || []).map((p: { name: string; objective: string }) => `- ${p.name}: ${p.objective}`).join("\n") || "- Por definir"}\n\n¿Querés que genere el contenido para las primeras 2 semanas? ¿O preferís ajustar algo primero?`;
    } else {
      const result = await provider.generateText({
        prompt: message,
        system_prompt: SYSTEM_PROMPT,
        max_tokens: 2000,
      });

      response = result.text;
      data = { tokens_used: result.tokens_used, model: result.model };
    }

    return NextResponse.json({
      response,
      data,
      costSummary: getTodayCost(),
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Chat API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isAIError = errorMessage.includes("NOT CONFIGURED") || errorMessage.includes("API_KEY");
    return NextResponse.json(
      {
        error: isAIError ? "AI PROVIDER NOT CONFIGURED" : "Error al procesar el mensaje",
        details: errorMessage,
        hint: isAIError ? "Set OPENROUTER_API_KEY or GROQ_API_KEY in .env.local" : undefined,
      },
      { status: isAIError ? 503 : 500 }
    );
  }
}
