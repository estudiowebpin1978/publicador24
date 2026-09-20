import { NextRequest, NextResponse } from "next/server";
import { createYouTubeVideo } from "@/lib/youtube";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await createYouTubeVideo(
      body.title || "Quiniela IA - Predicciones y resultados",
      body.description || "Contenido generado por Quiniela IA con datos reales y predicciones de la quiniela",
      body.videoUrl || body.assetUrl
    );
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
