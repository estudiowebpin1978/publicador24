import { NextRequest, NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai/provider";
import { wrapProviderWithCostTracking, getTodayCost } from "@/lib/ai/cost-tracker";
import { getSupabaseAdmin } from "@/lib/supabase/server";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  message: string;
  history?: ChatMessage[];
}

const SYSTEM_PROMPT = `Sos Publicador24, asistente de marketing para Quiniela IA. Tu objetivo: crear campañas que generen demanda real para quiniela-ia-two.vercel.app.

CAPACIDADES:
- Analizar negocios
- Descubrir audiencias
- Crear estrategias de marketing
- Generar contenido para TikTok e Instagram
- Programar publicaciones automáticas

FORMATO:
- Español rioplatense (voseo)
- Conciso, directo
- Siempre pensar en GENERAR DEMANDA, no solo likes
- Si el usuario da datos del negocio, generá campaña inmediatamente`;

function extractCampaignData(message: string): { name?: string; description?: string; audience?: string; objective?: string; platforms?: string[]; website?: string } {
  const data: { name?: string; description?: string; audience?: string; objective?: string; platforms?: string[]; website?: string } = {};

  const namePatterns = [
    /(?:nombre del negocio|negocio|business)\s*:?\s*\*\*?\s*([A-Z][a-zA-Z0-9\s&]+?)\s*\*\*/i,
    /(?:nombre|negocio|business)[\s:]*([A-Z][a-zA-Z0-9\s&]+?)(?:\.|\n|,|\r|$)/i,
  ];
  for (const p of namePatterns) {
    const m = message.match(p);
    if (m) {
      const name = m[1].trim();
      if (name.length > 1 && !name.toLowerCase().includes("nombre")) {
        data.name = name;
        break;
      }
    }
  }

  // Direct match for "Quiniela IA"
  if (!data.name && message.toLowerCase().includes("quiniela")) {
    const directMatch = message.match(/Quiniela\s*IA/i);
    if (directMatch) data.name = "Quiniela IA";
  }

  const descMatch = message.match(/(?:qué vend[eé]s|vend[eé]s?|hac[eé]s?|descripción)[\s:]*([^.]{10,200})/i);
  if (descMatch) data.description = descMatch[1].trim();

  const audienceMatch = message.match(/(?:a quién le vend[eé]s|público|audiencia)[\s:]*([^.]{10,200})/i);
  if (audienceMatch) data.audience = audienceMatch[1].trim();

  const objectiveMatch = message.match(/(?:objetivo|quiero conseguir|lograr)[\s:]*([^.]{10,200})/i);
  if (objectiveMatch) data.objective = objectiveMatch[1].trim();

  const platformsMatch = message.match(/(?:instagram|tiktok|plataformas)[\s:,]*([^.]{5,100})/i);
  if (platformsMatch) {
    const platformsStr = platformsMatch[1].toLowerCase();
    data.platforms = [];
    if (platformsStr.includes("tiktok") || platformsStr.includes("tik tok")) data.platforms.push("tiktok");
    if (platformsStr.includes("instagram") || platformsStr.includes("ig")) data.platforms.push("instagram");
    if (data.platforms.length === 0) data.platforms = ["tiktok", "instagram"];
  } else {
    data.platforms = ["tiktok", "instagram"];
  }

  const urlMatch = message.match(/(https?:\/\/[^\s]+)/i);
  if (urlMatch) data.website = urlMatch[1];

  if (message.toLowerCase().includes("quiniela ia")) data.name = data.name || "Quiniela IA";
  if (!data.description) data.description = message.substring(0, 200);
  if (!data.audience) data.audience = "Personas de Argentina interesadas en Quiniela, estadísticas y números";
  if (!data.objective) data.objective = "Lograr alcance viral, miles de seguidores y usuarios en la web";

  return data;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: "Mensaje requerido" }, { status: 400 });
    }

    const campaignData = extractCampaignData(message);
    const hasCampaignData = campaignData.name || campaignData.description || (message.length > 100);

    let response = "";
    let usedAI = false;

    try {
      const baseProvider = getAIProvider();
      const provider = wrapProviderWithCostTracking(baseProvider, "groq");

      if (hasCampaignData && (campaignData.name || message.toLowerCase().includes("quiniela"))) {
        const aiPrompt = `El usuario quiere promocionar: ${campaignData.name || 'Quiniela IA'} - ${campaignData.description || 'plataforma de análisis con IA para quiniela'}. Objetivo: ${campaignData.objective || 'alcance viral y usuarios'}. Plataformas: ${campaignData.platforms?.join(", ") || 'TikTok, Instagram'}. Generá una respuesta breve que confirme que se va a crear una campaña con contenido natural y realista, mencioná que se usará el sitio https://quiniela-ia-two.vercel.app. Sé entusiasta.`;

        const result = await provider.generateText({
          prompt: aiPrompt,
          system_prompt: SYSTEM_PROMPT,
          max_tokens: 600,
        });
        response = result.text;
        usedAI = true;
      } else {
        const result = await provider.generateText({
          prompt: message,
          system_prompt: SYSTEM_PROMPT,
          max_tokens: 800,
        });
        response = result.text;
        usedAI = true;
      }
    } catch {
      response = `Recibí los datos para **${campaignData.name || 'Quiniela IA'}**:\n\n- **Negocio:** ${campaignData.description || 'Plataforma web con IA para análisis de Quiniela'}\n- **Audiencia:** ${campaignData.audience || 'Personas en Argentina interesadas en Quiniela'}\n- **Objetivo:** ${campaignData.objective || 'Alcance viral, seguidores, usuarios web'}\n- **Plataformas:** ${(campaignData.platforms || ['TikTok', 'Instagram']).join(', ')}\n- **Web:** https://quiniela-ia-two.vercel.app/\n\nVoy a crear una campaña con contenido natural y realista (reels, posts, imágenes auténticas) para captar más gente. Las publicaciones irán directo a Buffer (Instagram + TikTok) automáticamente.`;
    }

    let campaignId: string | null = null;

    if (hasCampaignData) {
      try {
        const supabase = getSupabaseAdmin();
        const { data: campaign } = await supabase
          .from("campaigns")
          .insert({
            name: campaignData.name || "Quiniela IA",
            description: campaignData.description || "",
            idea: message.substring(0, 500),
            objective: campaignData.objective || "",
            target_audience: campaignData.audience || "",
            platforms: campaignData.platforms || ["instagram", "tiktok"],
            status: "DRAFT",
          })
          .select()
          .single();
        if (campaign) campaignId = campaign.id;
      } catch (e) {
        console.error("Failed to save campaign:", e);
      }
    }

    return NextResponse.json({
      response,
      data: { aiUsed: usedAI, campaignDetected: hasCampaignData, campaignId, ...campaignData },
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
