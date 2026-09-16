import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50")
    const campaignId = searchParams.get("campaign_id")
    const status = searchParams.get("status")

    let query = supabase
      .from("content_pieces")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (campaignId) query = query.eq("campaign_id", campaignId)
    if (status) query = query.eq("status", status)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ pieces: data || [] })
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener piezas" }, { status: 500 })
  }
}

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

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

    const supabase = getSupabaseAdmin()
    const updates: Record<string, unknown> = { updated_at: Date.now() }
    const allowed = ["title", "hook", "body", "cta", "status", "platform", "hashtags", "score", "content_type"]
    for (const field of allowed) {
      if (body[field] !== undefined) updates[field] = body[field]
    }

    const { data, error } = await supabase
      .from("content_pieces")
      .update(updates)
      .eq("id", body.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ piece: data })
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from("content_pieces").delete().eq("id", id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 })
  }
}
