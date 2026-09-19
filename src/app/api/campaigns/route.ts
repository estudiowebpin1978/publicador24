import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const { data: campaigns, error } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      const msg = error.message || ""
      if (msg.includes("does not exist") || msg.includes("relation")) {
        return NextResponse.json({ campaigns: [] })
      }
      throw error
    }

    const enriched = await Promise.all(
      (campaigns || []).map(async (campaign) => {
        const { count: totalCount } = await supabase
          .from("content_pieces")
          .select("*", { count: "exact", head: true })
          .eq("campaign_id", campaign.id)

        const { count: publishedCount } = await supabase
          .from("content_pieces")
          .select("*", { count: "exact", head: true })
          .eq("campaign_id", campaign.id)
          .eq("status", "PUBLISHED")

        return {
          ...campaign,
          content_count: totalCount || 0,
          published_count: publishedCount || 0,
        }
      })
    )

    return NextResponse.json({ campaigns: enriched })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al obtener campañas" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = getSupabaseAdmin()

    const insertData: Record<string, unknown> = {
      name: body.name,
      description: body.description || "",
      idea: body.idea || "",
      objective: body.objective || "",
      target_audience: body.target_audience || "",
      pain_points: body.pain_points || "",
      desires: body.desires || "",
      value_proposition: body.value_proposition || "",
      funnel_stage: body.funnel_stage || "",
      platforms: body.platforms || [],
      style: body.style || "profesional",
      offer: body.offer || "",
      url: body.url || "",
      status: body.status || "DRAFT",
      autopilot_level: body.autopilot_level || "MANUAL",
    }
    if (body.project_id) insertData.project_id = body.project_id

    const { data, error } = await supabase
      .from("campaigns")
      .insert(insertData)
      .select()
      .single()

    if (error) {
      const msg = error.message || ""
      if (msg.includes("does not exist") || msg.includes("relation")) {
        return NextResponse.json({ error: "Tabla no disponible" }, { status: 500 })
      }
      throw error
    }
    return NextResponse.json({ campaign: data })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al crear campaña" },
      { status: 500 }
    )
  }
}
