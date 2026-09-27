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
    if (!body?.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "name es requerido" }, { status: 400 })
    }
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
      // "relation" solo si la tabla realmente no existe: el mismo string
      // aparece en los errores NOT NULL ("column ... of relation ... violates")
      // y esos son de validación, no de esquema.
      if (msg.includes("does not exist") || msg.includes("Could not find the table") || msg.includes("schema cache")) {
        return NextResponse.json({ error: "Tabla no disponible" }, { status: 503 })
      }
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    return NextResponse.json({ campaign: data })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al crear campaña" },
      { status: 500 }
    )
  }
}
