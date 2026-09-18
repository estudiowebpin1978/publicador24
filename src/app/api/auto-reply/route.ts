import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { generateReply } from "@/lib/ai/auto-reply";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { commentId, comment, campaignId, platform } = body;

    if (!comment?.trim()) {
      return NextResponse.json({ error: "Comment is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: campaign } = await supabase
      .from("campaigns")
      .select("name, style")
      .eq("id", campaignId)
      .single();

    const reply = await generateReply(comment, {
      campaign: campaign?.name || "General",
      platform: platform || "instagram",
      tone: campaign?.style || "amigable",
    });

    const { data, error } = await supabase
      .from("auto_replies")
      .insert({
        comment_id: commentId || null,
        comment,
        reply,
        campaign_id: campaignId || null,
        platform: platform || "instagram",
        status: "generated",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ reply: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate reply" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("auto_replies")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ replies: data || [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch replies", replies: [] },
      { status: 500 }
    );
  }
}
