import { NextRequest, NextResponse } from "next/server";
import {
  generateBatch,
  resolveMarketingCompliance,
  type MarketingOptions,
} from "@/lib/marketing";
import { checkPublicationSafety } from "@/lib/ai/publication-safety";

const ALLOWED_COUNTS = [1, 5, 10, 20, 30] as const;

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

    const requested = Number(body?.count ?? 5);
    const count = (ALLOWED_COUNTS as readonly number[]).includes(requested) ? requested : 5;

    const rawOptions = (body?.options ?? {}) as MarketingOptions;
    const options: MarketingOptions = {
      ...rawOptions,
      demoMode: rawOptions.demoMode ?? process.env.DEMO_MODE === "true",
      // Mismo compliance que /api/marketing/generate: +18/disclaimer en nichos
      // regulados y CTA con URL en todas las piezas del lote.
      compliance: resolveMarketingCompliance(idea, rawOptions.compliance, rawOptions.niche),
    };

    const startedAt = Date.now();
    const result = await generateBatch(count, idea, options);

    // Mismo control de seguridad que generate (spam / duplicados / claims) por pieza.
    const existingTexts = Array.isArray(body?.existingTexts)
      ? body.existingTexts.filter((t: unknown): t is string => typeof t === "string")
      : [];
    const safety: Record<
      string,
      { approved: boolean; score: number; reason: string | undefined }
    > = {};
    for (const piece of result.campaign.pieces) {
      const s = await checkPublicationSafety(
        piece.id,
        piece.hook,
        piece.caption,
        piece.platform,
        existingTexts
      );
      safety[piece.id] = { approved: s.approved, score: s.safetyScore, reason: s.reason };
    }

    return NextResponse.json({
      success: true,
      ...result,
      safety,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error("Marketing batch error:", error);
    return NextResponse.json(
      { error: "Error al generar el lote", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
