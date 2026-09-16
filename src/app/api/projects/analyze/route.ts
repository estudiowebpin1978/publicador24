import { NextRequest, NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai/provider";
import { wrapProviderWithCostTracking } from "@/lib/ai/cost-tracker";

interface WebsiteAnalysis {
  title: string;
  description: string;
  industry: string;
  target_audience: string;
  brand_voice: string;
  strengths: string[];
  opportunities: string[];
  suggested_platforms: string[];
  confidence: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url?.trim()) {
      return NextResponse.json({ error: "URL requerida" }, { status: 400 });
    }

    let pageContent = "";
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Publicador24/1.0 (website analysis)" },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const html = await res.text();
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i);
        const ogTitle = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i);
        const ogDesc = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i);
        pageContent = [
          titleMatch?.[1],
          descMatch?.[1],
          ogTitle?.[1],
          ogDesc?.[1],
        ].filter(Boolean).join(" | ");
        if (!pageContent) {
          pageContent = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").substring(0, 2000);
        }
      }
    } catch {
      pageContent = "No se pudo acceder al sitio web";
    }

    let analysis: WebsiteAnalysis;
    try {
      const baseProvider = getAIProvider();
      const provider = wrapProviderWithCostTracking(baseProvider, "groq");

      const result = await provider.generateText({
        prompt: `Analizá este sitio web y respondé JSON con:
{
  "title": "nombre del negocio",
  "description": "qué vende/hace en 1 línea",
  "industry": "industria",
  "target_audience": "audiencia ideal",
  "brand_voice": "tono de comunicación",
  "strengths": ["fortaleza 1", "fortaleza 2"],
  "opportunities": ["oportunidad 1", "oportunidad 2"],
  "suggested_platforms": ["instagram", "tiktok"],
  "confidence": 80
}

URL: ${url}
Contenido: ${pageContent.substring(0, 2000)}`,
        system_prompt: "Sos un experto en marketing digital. Analizá el sitio web y respondé JSON válido sin texto adicional.",
        max_tokens: 600,
      });

      const match = result.text.match(/```json\s*([\s\S]*?)```/);
      analysis = JSON.parse(match ? match[1] : result.text);
    } catch {
      analysis = {
        title: pageContent.substring(0, 50) || "Negocio desconocido",
        description: pageContent.substring(0, 200) || "Descripción no disponible",
        industry: "General",
        target_audience: "Audiencia general",
        brand_voice: "Profesional",
        strengths: ["Presencia online activa"],
        opportunities: ["Mejorar contenido en redes sociales"],
        suggested_platforms: ["instagram", "tiktok"],
        confidence: 30,
      };
    }

    return NextResponse.json({ url, analysis });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
