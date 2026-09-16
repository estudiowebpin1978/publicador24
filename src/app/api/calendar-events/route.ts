import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data: scheduledPosts, error: spError } = await supabase
      .from("scheduled_posts")
      .select("id, platform, scheduled_at, status, channel_name, content_piece_id")
      .order("scheduled_at", { ascending: true })
      .limit(100);

    if (spError) throw spError;

    const { data: contentPieces, error: cpError } = await supabase
      .from("content_pieces")
      .select("id, title, hook, body, platform, status")
      .limit(200);

    if (cpError) throw cpError;

    const pieceMap = new Map((contentPieces || []).map((p) => [p.id, p]));

    const events = (scheduledPosts || []).map((post) => {
      const piece = post.content_piece_id ? pieceMap.get(post.content_piece_id) : null;
      const title = piece?.title || piece?.hook || "Publicación programada";
      const scheduledDate = new Date(post.scheduled_at);

      return {
        id: post.id,
        title,
        date: scheduledDate,
        platform: post.platform,
        status: post.status === "published" ? "published"
          : post.status === "pending" || post.status === "publishing" ? "scheduled"
          : "draft",
        time: scheduledDate.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
      };
    });

    return NextResponse.json({ events });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error", events: [] },
      { status: 500 }
    );
  }
}
