import { NextRequest, NextResponse } from "next/server";
import { generateTextWithFallback } from "@/lib/ai/multi-provider";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("content_pieces")
      .select("hashtags")
      .not("hashtags", "is", null)
      .limit(100);

    if (error) throw error;

    const tagSet = new Map<string, { count: number; category: string }>();
    for (const row of data || []) {
      for (const tag of row.hashtags || []) {
        const existing = tagSet.get(tag) || { count: 0, category: "General" };
        existing.count++;
        tagSet.set(tag, existing);
      }
    }

    const hashtags = Array.from(tagSet.entries())
      .map(([tag, info]) => ({
        tag,
        category: info.category,
        relevance: Math.min(100, info.count * 15 + 30),
        popularity: `${info.count} usos`,
      }))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 30);

    return NextResponse.json({ hashtags });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error", hashtags: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic } = body;

    if (!topic?.trim()) {
      return NextResponse.json({ error: "Tema requerido" }, { status: 400 });
    }

    const result = await generateTextWithFallback(
      `Generá 20 hashtags relevantes para el tema: "${topic}". Respondé JSON: { "hashtags": [{ "tag": "#ejemplo", "category": "Categoría", "relevance": 85, "popularity": "Alta" }] }`,
      "Sos un experto en marketing de redes sociales. Español. JSON válido."
    );

    try {
      const match = result.text.match(/```json\s*([\s\S]*?)```/);
      const jsonStr = match ? match[1] : result.text;
      const parsed = JSON.parse(jsonStr.trim());
      return NextResponse.json({ hashtags: parsed.hashtags || [] });
    } catch {
      const lines = result.text.split("\n").filter(l => l.includes("#"));
      const hashtags = lines.map((line, i) => ({
        tag: line.replace(/[^#\w]/g, "").substring(0, 30) || `#${topic.split(" ")[0]}`,
        category: "General",
        relevance: 80 - i * 2,
        popularity: "Media",
      }));
      return NextResponse.json({ hashtags: hashtags.slice(0, 20) });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
