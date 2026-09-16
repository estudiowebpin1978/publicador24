import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from("content_pieces")
      .insert({
        content_pack_id: body.content_pack_id || null,
        campaign_id: body.campaign_id,
        title: body.title || "",
        hook: body.hook || "",
        body: body.body || "",
        cta: body.cta || "",
        content_type: body.content_type || "post",
        funnel_stage: body.funnel_stage || "interest",
        platform: body.platform || "instagram",
        hashtags: body.hashtags || [],
        score: body.score || 0,
        status: body.status || "DRAFT",
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ piece: data })
  } catch (error) {
    return NextResponse.json({ error: "Error al crear pieza" }, { status: 500 })
  }
}
