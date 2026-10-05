import { NextRequest, NextResponse } from "next/server";
import { generateBatch, type MarketingOptions } from "@/lib/marketing";

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

    const options = (body?.options ?? {}) as MarketingOptions;
    const normalized: MarketingOptions = {
      ...options,
      demoMode: options.demoMode ?? process.env.DEMO_MODE === "true",
    };

    const startedAt = Date.now();
    const result = await generateBatch(count, idea, normalized);

    return NextResponse.json({
      success: true,
      ...result,
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
