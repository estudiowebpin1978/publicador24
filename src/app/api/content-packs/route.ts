import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body?.campaign_id) {
      return NextResponse.json({ error: "campaign_id es requerido" }, { status: 400 })
    }
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from("content_packs")
      .insert({
        campaign_id: body.campaign_id,
        name: body.name || "Pack de contenido",
        total_pieces: body.total_pieces || 0,
        generated_pieces: body.generated_pieces || 0,
        status: "active",
      })
      .select()
      .single()

    if (error) {
      const msg = error.message || ""
      if (msg.includes("does not exist") || msg.includes("Could not find the table")) {
        return NextResponse.json({ pack: null }, { status: 503 })
      }
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    return NextResponse.json({ pack: data })
  } catch (error) {
    return NextResponse.json({ error: "Error al crear pack" }, { status: 500 })
  }
}
