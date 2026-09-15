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
}

const SYSTEM_PROMPT = `Sos Publicador24, un motor autónomo de marketing digital con inteligencia artificial.

Tu función principal es ayudar a crear campañas de marketing que generen demanda real.

CAPACIDADES:
1. Analizar negocios y sitios web
2. Descubrir audiencias automáticamente
3. Crear estrategias de marketing completas
4. Generar contenido variado para todas las plataformas

FORMATO DE RESPUESTA:
- Usá español rioplatense (voseo)
- Sé conciso y directo
- Cuando generes contenido, incluí hooks, captions, hashtags y CTAs
- Siempre pensá en el objetivo de GENERAR DEMANDA, no solo contenido

IMPORTANTE:
- No inventes información que no tengas confirmada
- Si falta información clave, preguntala antes de asumir`;

function templateResponse(message: string): string {
  const lower = message.toLowerCase();
  if (/campaña|campaign|quiero conseguir|necesito contenido|promocionar/i.test(lower)) {
    return `¡Dale! Para armar una buena campaña necesito:\n\n1. **Nombre del negocio** - ¿Cómo se llama?\n2. **¿Qué vendés o hacés?** - Descripción breve\n3. **¿A quién le vendés?** - Tu público ideal\n4. **Objetivo** - ¿Querés más seguidores, ventas, leads?\n5. **Plataformas** - Instagram, TikTok, ambas?\n\nPasame esos datos y te armo la estrategia completa con contenido listo para publicar.`;
  }
  if (/hola|hello|hey|buenas/i.test(lower)) {
    return `¡Hola! Soy Publicador24, tu asistente de marketing con IA. ¿En qué te puedo ayudar? Puedo:\n\n- Crear campañas de contenido\n- Analizar tu negocio y audiencia\n- Generar posts para Instagram y TikTok\n- Programar publicaciones automáticas\n\n¿Por dónde arrancamos?`;
  }
  return `Recibí tu mensaje: "${message}"\n\nPara ayudarte mejor, contame sobre tu negocio o decime qué necesitás. Puedo crear campañas, analizar sitios web, o generar contenido para tus redes.`;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: "Mensaje requerido" }, { status: 400 });
    }

    let response = "";
    let usedAI = false;

    try {
      const baseProvider = getAIProvider();
      const provider = wrapProviderWithCostTracking(baseProvider, "openrouter");

      const result = await provider.generateText({
        prompt: message,
        system_prompt: SYSTEM_PROMPT,
        max_tokens: 800,
      });

      response = result.text;
      usedAI = true;
    } catch {
      response = templateResponse(message);
    }

    return NextResponse.json({
      response,
      data: { aiUsed: usedAI },
      costSummary: getTodayCost(),
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Chat API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Error al procesar el mensaje", details: errorMessage },
      { status: 500 }
    );
  }
}
