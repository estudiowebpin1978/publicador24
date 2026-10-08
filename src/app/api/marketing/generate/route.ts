import { NextRequest, NextResponse } from "next/server";
import {
  generateMarketingPiece,
  resolveMarketingCompliance,
  type MarketingOptions,
} from "@/lib/marketing";
import { checkPublicationSafety } from "@/lib/ai/publication-safety";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const idea = typeof body?.idea === "string" ? body.idea.trim() : "";

    if (idea.length < 10) {
      return NextResponse.json(
        { error: "La idea debe tener al menos 10 caracteres" },
        { status: 400 }
      );
    }

    const rawOptions = (body?.options ?? {}) as MarketingOptions;

    const options: MarketingOptions = {
      ...rawOptions,
      demoMode: rawOptions.demoMode ?? process.env.DEMO_MODE === "true",
      // +18/disclaimer para nichos regulados y CTA con URL siempre.
      compliance: resolveMarketingCompliance(idea, rawOptions.compliance, rawOptions.niche),
    };

    const piece = await generateMarketingPiece(idea, options);

    // Mismo control de seguridad que antes de publicar (spam / duplicados / largo).
    // `existingTexts` permite comparar contra lo ya publicado (mismo umbral
    // 0.75 que usa el autopilot). Sin historial, solo corren los controles
    // de spam/longitud/lenguaje.
    const existingTexts = Array.isArray(body?.existingTexts)
      ? body.existingTexts.filter((t: unknown): t is string => typeof t === "string")
      : [];

    const safety = await checkPublicationSafety(
      piece.id,
      piece.hook,
      piece.caption,
      piece.platform,
      existingTexts
    );

    return NextResponse.json({
      success: true,
      piece,
      safety: {
        approved: safety.approved,
        score: safety.safetyScore,
        reason: safety.reason,
      },
      demoMode: options.demoMode === true,
    });
  } catch (error) {
    console.error("Marketing generation error:", error);
    return NextResponse.json(
      { error: "Error al generar la pieza", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
