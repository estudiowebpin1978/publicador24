import { NextRequest, NextResponse } from "next/server";
import { generateTextWithFallback } from "@/lib/ai/multi-provider";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, objective, audience, language, tone, platforms, cta } = body;

    if (!topic?.trim()) {
      return NextResponse.json({ error: "Tema requerido" }, { status: 400 });
    }

    const langMap: Record<string, string> = {
      en: "inglés", es: "español rioplatense (voseo)", fr: "francés",
      de: "alemán", pt: "portugués",
    };

    const toneMap: Record<string, string> = {
      professional: "profesional", casual: "casual", funny: "divertido",
      urgent: "urgente", inspirational: "inspiracional",
    };

    const systemPrompt = `Sos un experto en copywriting para redes sociales en ${langMap[language] || "español"}. Creá contenido que GENERE DEMANDA y CONECTE con la audiencia. Respondé SIEMPRE con JSON válido, sin texto adicional.`;

    const platformList = platforms?.length ? platforms.join(", ") : "instagram, tiktok";

    const prompt = `Generá contenido para: ${topic}
OBJETIVO: ${objective || "generar engagement"}
PÚBLICO: ${audience || "general"}
TONO: ${toneMap[tone] || "profesional"}
PLATAFORMAS: ${platformList}
CTA: ${cta || "Link en bio"}

Respondé con JSON:
{
  "original": "contenido principal",
  "variants": { "instagram": "...", "tiktok": "...", "x": "..." },
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"],
  "mentions": [],
  "score": 82,
  "risk": "low",
  "bestTime": "9:00 AM - 11:00 AM"
}`;

    const result = await generateTextWithFallback(prompt, systemPrompt);

    try {
      const match = result.text.match(/```json\s*([\s\S]*?)```/);
      const jsonStr = match ? match[1] : result.text;
      const parsed = JSON.parse(jsonStr.trim());
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({
        original: result.text.substring(0, 500),
        variants: {},
        hashtags: [],
        mentions: [],
        score: 70,
        risk: "low",
        bestTime: "9:00 AM - 11:00 AM",
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
