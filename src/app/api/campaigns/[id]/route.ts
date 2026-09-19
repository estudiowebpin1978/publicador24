import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/server"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      const msg = error.message || ""
      if (msg.includes("does not exist") || msg.includes("relation")) {
        return NextResponse.json({ campaign: null })
      }
      return NextResponse.json({ campaign: null })
    }
    return NextResponse.json({ campaign: data })
  } catch {
    return NextResponse.json({ campaign: null })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const supabase = getSupabaseAdmin()

    const updates: Record<string, unknown> = {}
    const allowed = [
      "name",
      "description",
      "idea",
      "objective",
      "target_audience",
      "pain_points",
      "desires",
      "value_proposition",
      "funnel_stage",
      "platforms",
      "style",
      "offer",
      "url",
      "status",
      "autopilot_level",
      "budget",
      "start_date",
      "end_date",
    ]

    for (const field of allowed) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("campaigns")
      .update(updates)
      .eq("id", id)
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
      { error: error instanceof Error ? error.message : "Error al actualizar" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabaseAdmin()

    const { error } = await supabase
      .from("content_pieces")
      .delete()
      .eq("campaign_id", id)

    if (error) {
      const msg = error.message || ""
      if (!msg.includes("does not exist") && !msg.includes("relation")) {
        throw error
      }
    }

    const { error: deleteError } = await supabase
      .from("campaigns")
      .delete()
      .eq("id", id)

    if (deleteError) {
      const msg = deleteError.message || ""
      if (msg.includes("does not exist") || msg.includes("relation")) {
        return NextResponse.json({ success: false })
      }
      throw deleteError
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al eliminar" },
      { status: 500 }
    )
  }
}
