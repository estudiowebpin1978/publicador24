import { NextResponse } from "next/server";
import { getTodayCost } from "@/lib/ai/cost-tracker";

export async function GET() {
  const aiProvider = process.env.AI_PROVIDER || "openrouter";
  const hasOpenRouter = !!process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== "your-key";
  const hasGroq = !!process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== "your-key";
  const bufferKey = process.env.BUFFER_API_KEY;
  const bufferConfigured = !!bufferKey && bufferKey !== "tu-key-aqui" && bufferKey !== "your-buffer-api-key";
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const costSummary = getTodayCost();

  const aiStatus = aiProvider === "openrouter"
    ? (hasOpenRouter ? "CONFIGURED" : "NOT CONFIGURED — OPENROUTER_API_KEY missing")
    : aiProvider === "groq"
    ? (hasGroq ? "CONFIGURED" : "NOT CONFIGURED — GROQ_API_KEY missing")
    : `UNKNOWN PROVIDER: ${aiProvider}`;

  const allStatuses = {
    ai: {
      provider: aiProvider,
      status: aiStatus,
      model: aiProvider === "openrouter"
        ? (process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001")
        : (process.env.GROQ_MODEL || "llama-3.3-70b-versatile"),
    },
    buffer: {
      status: bufferConfigured ? "CONFIGURED" : "NOT CONFIGURED — BUFFER_API_KEY is placeholder (tu-key-aqui). Get a real key from https://buffer.com/developers/api",
      apiKeyPresent: bufferConfigured,
    },
    convex: {
      url: convexUrl || "NOT SET",
      status: convexUrl ? "CONFIGURED" : "NOT CONFIGURED — NEXT_PUBLIC_CONVEX_URL missing",
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
    ready: aiStatus === "CONFIGURED" && bufferConfigured,
  });
}
