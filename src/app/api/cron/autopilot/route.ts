import { NextRequest, NextResponse } from "next/server";
import { POST as autopilotPOST } from "@/app/api/autopilot/route";

// El ciclo incluye render de video con ffmpeg (TikTok/YouTube). Hobby permite
// hasta 300s por funcion (docs de planes de Vercel) y se usa casi todo: cubrir
// todas las campanas en una sola pasada requiere varias publicaciones pesadas
// (IA + render + publicar).
export const maxDuration = 300;

async function runAutopilot(request: NextRequest) {
  // Check auth: header OR query param
  const authHeader = request.headers.get("authorization");
  const { searchParams } = new URL(request.url);
  const secretParam = searchParams.get("secret");

  const validSecret = process.env.CRON_SECRET;
  const isAuthorized = authHeader === `Bearer ${validSecret}` || secretParam === validSecret;

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await autopilotPOST();
    const raw = await result.json().catch(() => null);
    const payload =
      raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};

    // Bucle de aprendizaje: toma las metricas de lo publicado y ajusta la
    // estrategia. Best-effort: si falla, no afecta el resultado del autopilot.
    let learning: unknown = { skipped: true };
    try {
      const { runLearningLoop } = await import("@/lib/ai/learning-loop");
      learning = await runLearningLoop();
    } catch (error) {
      learning = { error: error instanceof Error ? error.message : "unknown" };
    }

    return NextResponse.json({ ...payload, learning }, { status: result.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return runAutopilot(request);
}

export async function POST(request: NextRequest) {
  return runAutopilot(request);
}
