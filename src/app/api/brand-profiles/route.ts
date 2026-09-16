import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");

    let query = supabase.from("brand_profiles").select("*");
    if (projectId) {
      query = query.eq("project_id", projectId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();

    if (!body.project_id) {
      return NextResponse.json({ error: "project_id requerido" }, { status: 400 });
    }

    const now = Date.now();
    const { data, error } = await supabase
      .from("brand_profiles")
      .insert({
        project_id: body.project_id,
        tone: body.tone || null,
        values: body.values || [],
        personality: body.personality || null,
        writing_style: body.writing_style || null,
        colors: body.colors || null,
        fonts: body.fonts || null,
        logo_url: body.logo_url || null,
        website: body.website || null,
        phone: body.phone || null,
        location: body.location || null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: "Brand profile ID required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updated_at: Date.now() };
    const allowedFields = ["tone", "values", "personality", "writing_style", "colors", "fonts", "logo_url", "website", "phone", "location"];
    for (const field of allowedFields) {
      if (body[field] !== undefined) updates[field] = body[field];
    }

    const { data, error } = await supabase
      .from("brand_profiles")
      .update(updates)
      .eq("id", body.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
