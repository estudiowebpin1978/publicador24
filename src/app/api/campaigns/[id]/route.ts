import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/server"
import { getCampaignImages, setCampaignImages } from "@/lib/campaign-images"

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

    const images = await getCampaignImages(id)
    return NextResponse.json({ campaign: { ...data, images } })
  } catch {
    return NextResponse.json({ error: "No autorizado o no encontrado" }, { status: 403 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("campaigns").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await setCampaignImages(id, []);
    return NextResponse.json({ success: true, deleted: id });
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
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

    // Las imágenes se guardan aparte (no hay columna en campaigns).
    const imagesUpdate =
      body.images !== undefined && Array.isArray(body.images) ? body.images : null

    if (Object.keys(updates).length === 0 && imagesUpdate === null) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 })
    }

    let data: Record<string, unknown> | null = null

    if (Object.keys(updates).length > 0) {
      const res = await supabase
        .from("campaigns")
        .update(updates)
        .eq("id", id)
        .select()
        .single()

      if (res.error) {
        const msg = res.error.message || ""
        if (msg.includes("does not exist") || msg.includes("relation")) {
          return NextResponse.json({ error: "Tabla no disponible" }, { status: 500 })
        }
        throw res.error
      }
      data = res.data as Record<string, unknown>
    } else {
      const res = await supabase.from("campaigns").select("*").eq("id", id).single()
      data = res.data as Record<string, unknown>
    }

    if (imagesUpdate !== null) {
      await setCampaignImages(id, imagesUpdate)
    }

    if (!data) {
      return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 })
    }

    const images = await getCampaignImages(id)
    return NextResponse.json({ campaign: { ...data, images } })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al actualizar" },
      { status: 500 }
    )
  }
}


