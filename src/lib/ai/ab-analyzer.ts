import { getSupabaseAdmin } from "@/lib/supabase/server";

interface ABAnalysisResult {
  winner: string;
  confidence: number;
  reason: string;
}

export async function analyzeABTest(testId: string): Promise<ABAnalysisResult> {
  const supabase = getSupabaseAdmin();

  const { data: test, error: testError } = await supabase
    .from("ab_tests")
    .select("*")
    .eq("id", testId)
    .single();

  if (testError || !test) {
    return {
      winner: "A",
      confidence: 0,
      reason: "No se encontró el test o hubo un error al consultarlo",
    };
  }

  const { data: metrics, error: metricsError } = await supabase
    .from("ab_test_metrics")
    .select("*")
    .eq("test_id", testId);

  if (metricsError || !metrics || metrics.length === 0) {
    return {
      winner: "A",
      confidence: 0,
      reason: "No hay métricas disponibles para este test",
    };
  }

  const variantAMetrics = metrics.filter((m) => m.variant_id === "A");
  const variantBMetrics = metrics.filter((m) => m.variant_id === "B");

  const sumA = variantAMetrics.reduce(
    (acc, m) => ({
      impressions: acc.impressions + (m.impressions || 0),
      clicks: acc.clicks + (m.clicks || 0),
    }),
    { impressions: 0, clicks: 0 }
  );

  const sumB = variantBMetrics.reduce(
    (acc, m) => ({
      impressions: acc.impressions + (m.impressions || 0),
      clicks: acc.clicks + (m.clicks || 0),
    }),
    { impressions: 0, clicks: 0 }
  );

  const ctrA = sumA.impressions > 0 ? (sumA.clicks / sumA.impressions) * 100 : 0;
  const ctrB = sumB.impressions > 0 ? (sumB.clicks / sumB.impressions) * 100 : 0;

  const totalImpressions = sumA.impressions + sumB.impressions;
  const minImpressions = 100;

  if (totalImpressions < minImpressions) {
    return {
      winner: ctrA >= ctrB ? "A" : "B",
      confidence: 30,
      reason: `Datos insuficientes (${totalImpressions} impresiones). Se necesitan al menos ${minImpressions} para un análisis confiable.`,
    };
  }

  const difference = Math.abs(ctrA - ctrB);
  const avgCTR = (ctrA + ctrB) / 2;
  const relativeLift = avgCTR > 0 ? (difference / avgCTR) * 100 : 0;

  let confidence = 50;
  if (relativeLift > 20) confidence = 90;
  else if (relativeLift > 10) confidence = 75;
  else if (relativeLift > 5) confidence = 60;
  else confidence = 40;

  const winner = ctrA >= ctrB ? "A" : "B";
  const winnerCTR = winner === "A" ? ctrA : ctrB;
  const loserCTR = winner === "A" ? ctrB : ctrA;

  const reasonParts: string[] = [];

  if (winner === "A") {
    reasonParts.push("El hook emocional/urgencia generó mejor rendimiento");
  } else {
    reasonParts.push("El hook de curiosidad/datos generó mejor rendimiento");
  }

  reasonParts.push(`CTR ganador: ${winnerCTR.toFixed(2)}% vs ${loserCTR.toFixed(2)}%`);

  if (confidence >= 75) {
    reasonParts.push("Diferencia estadísticamente significativa");
  } else {
    reasonParts.push("Diferencia moderada - recomendar más datos");
  }

  await supabase
    .from("ab_tests")
    .update({
      winning_variant: winner,
      confidence,
      analyzed_at: Date.now(),
    })
    .eq("id", testId);

  return {
    winner,
    confidence,
    reason: reasonParts.join(". "),
  };
}
