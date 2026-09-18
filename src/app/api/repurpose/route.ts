import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { repurposeToReels, repurposeToCarousel, repurposeToStory, repurposeToThread } from "@/lib/ai/repurpose";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = getSupabaseAdmin();
    const { contentId, formats } = body;

    if (!contentId || !formats || !Array.isArray(formats)) {
      return NextResponse.json({ error: "contentId and formats[] required" }, { status: 400 });
    }

    const { data: piece, error: pieceError } = await supabase
      .from("content_pieces")
      .select("id, title, body, hook, campaign_id")
      .eq("id", contentId)
      .single();

    if (pieceError || !piece) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    const content = { hook: piece.hook || piece.title, body: piece.body };
    const results: Record<string, unknown> = {};

    for (const format of formats) {
      try {
        switch (format) {
          case "reels":
            results.reels = await repurposeToReels(content);
            break;
          case "carousel":
            results.carousel = await repurposeToCarousel(content);
            break;
          case "story":
            results.story = await repurposeToStory(content);
            break;
          case "thread":
            results.thread = await repurposeToThread(content);
            break;
          default:
            results[format] = { error: `Unknown format: ${format}` };
        }
      } catch (e) {
        results[format] = { error: e instanceof Error ? e.message : "Generation failed" };
      }
    }

    await supabase.from("repurposed_content").insert({
      content_piece_id: contentId,
      campaign_id: piece.campaign_id,
      formats,
      result: results,
      created_at: Date.now(),
    });

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
