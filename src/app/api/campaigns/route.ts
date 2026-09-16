import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error
    return NextResponse.json({ campaigns: data || [] })
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener campañas" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from("campaigns")
      .insert({
        name: body.name,
        description: body.description || "",
        idea: body.idea || "",
        objective: body.objective || "",
        target_audience: body.target_audience || "",
        platforms: body.platforms || [],
        style: body.style || "profesional",
        offer: body.offer || "",
        url: body.url || "",
        status: body.status || "DRAFT",
        content_count: body.content_count || 0,
        published_count: body.published_count || 0,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ campaign: data })
  } catch (error) {
    return NextResponse.json({ error: "Error al crear campaña" }, { status: 500 })
  }
}
