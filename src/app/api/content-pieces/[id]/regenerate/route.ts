import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { generateTextWithFallback } from "@/lib/ai/multi-provider";

interface Regenerated {
  hook?: string;
  title?: string;
  body?: string;
  cta?: string;
  hashtags?: string[];
}

function parseJson(text: string): Regenerated | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as Regenerated;
  } catch {
    return null;
  }
}

/**
 * Regenera con IA el contenido de una pieza existente.
 * Ruta que la ficha de campaña llama desde "Regenerar" (antes devolvía 404).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { data: piece, error: fetchError } = await supabase
      .from("content_pieces")
      .select("*, campaigns(name, objective, target_audience)")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !piece) {
      const reason = fetchError?.message ? ` (${fetchError.message})` : "";
      return NextResponse.json(
        { error: `Pieza no encontrada${reason}` },
        { status: fetchError ? 500 : 404 }
      );
    }

    const campaign = piece.campaigns as Record<string, string> | null;
    const platform = piece.platform || "instagram";

    const response = await generateTextWithFallback(
      `Regenerá (variando siempre la idea original) este contenido para ${platform}.
Campaña: ${campaign?.name || "general"}
Tema previo: ${piece.title || piece.hook || ""}
Cuerpo previo: ${(piece.body || "").slice(0, 400)}
Idioma: español rioplatense (voseo).

Respondé SOLO con este JSON:
{
  "hook": "Frase gancho (máximo 10 palabras)",
  "title": "Título corto",
  "body": "Cuerpo del post",
  "cta": "Call to action con URL quiniela-ia-two.vercel.app",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
}`,
      `Sos un experto en marketing para ${platform}. Respondé SOLO el JSON válido, sin texto adicional.`
    );

    const content = parseJson(response.text);
    if (!content?.body) {
      return NextResponse.json(
        { error: "La IA no devolvió contenido válido, reintentá" },
        { status: 502 }
      );
    }

    const updates: Record<string, unknown> = {
      hook: content.hook || piece.hook,
      title: content.title || content.hook || piece.title,
      body: content.body,
      cta: content.cta || piece.cta,
      hashtags: content.hashtags || piece.hashtags || [],
      updated_at: Date.now(),
    };
    if (piece.status === "PUBLISHED") updates.status = "GENERATED";

    const { data: updated, error: updateError } = await supabase
      .from("content_pieces")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ piece: updated, regenerated: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
