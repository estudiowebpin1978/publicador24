import { NextResponse } from "next/server";
import { getTodayCost } from "@/lib/ai/cost-tracker";

export async function GET() {
  const aiProvider = process.env.AI_PROVIDER || "groq";
  const hasGroq = !!process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== "your-key";
  const hasHF = !!process.env.HF_API_KEY;
  const bufferKey = process.env.BUFFER_API_KEY;
  const bufferConfigured = !!bufferKey && bufferKey !== "tu-key-aqui" && bufferKey !== "your-buffer-api-key";
  const hasSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const costSummary = getTodayCost();

  const aiStatus = hasGroq ? "CONFIGURED" : hasHF ? "CONFIGURED (HF)" : "NOT CONFIGURED";

  const allStatuses = {
    ai: {
      provider: aiProvider,
      status: aiStatus,
      groq: hasGroq ? "CONFIGURED" : "NOT CONFIGURED",
      huggingface: hasHF ? "CONFIGURED" : "NOT CONFIGURED",
    },
    buffer: {
      status: bufferConfigured ? "CONFIGURED" : "NOT CONFIGURED",
      apiKeyPresent: bufferConfigured,
    },
    supabase: {
      status: hasSupabase ? "CONFIGURED" : "NOT CONFIGURED",
    },
    costTracking: {
      todayCostUsd: costSummary.totalCost,
      todayTokens: costSummary.totalTokens,
      todayOperations: costSummary.count,
    },
    environment: process.env.NODE_ENV || "unknown",
  };

  const overallStatus = aiStatus === "CONFIGURED" ? "PARTIAL" : "BLOCKED";

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    platform: "publicador24",
    integrations: allStatuses,
    ready: aiStatus === "CONFIGURED" && bufferConfigured && hasSupabase,
  });
}
