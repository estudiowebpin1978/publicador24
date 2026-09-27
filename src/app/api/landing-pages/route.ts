import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { generateLandingPage } from "@/lib/landing-page";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignId, name, description, cta, url } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Campaign name is required" }, { status: 400 });
    }

    const html = await generateLandingPage({
      name,
      description: description || "",
      cta: cta || "Conocer mas",
      url: url || "",
    });

    const supabase = getSupabaseAdmin();

    const baseRow: Record<string, unknown> = {
      campaign_id: campaignId || null,
      name,
      html,
      url: url || null,
    };
    const fullRow: Record<string, unknown> = {
      ...baseRow,
      description: description || "",
      cta: cta || "Conocer mas",
      slug: name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, ""),
    };

    // El esquema real de landing_pages puede no tener description/cta/slug:
    // probamos completo y volvemos a la versión mínima si falta alguna columna.
    let inserted = await supabase.from("landing_pages").insert(fullRow).select().single();
    if (inserted.error && /column/i.test(inserted.error.message || "")) {
      inserted = await supabase.from("landing_pages").insert(baseRow).select().single();
    }

    const { data, error } = inserted;

    if (error) {
      const msg = error.message || "";
      if (msg.includes("does not exist") || msg.includes("Could not find the table")) {
        return NextResponse.json({ landingPages: [] }, { status: 503 });
      }
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return NextResponse.json({ landingPage: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate landing page" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    // select("*"): el esquema real no siempre trae description/cta/slug y un
    // select explícito con columnas inexistentes rompía toda la lista.
    const { data, error } = await supabase
      .from("landing_pages")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      const msg = error.message || "";
      if (msg.includes("does not exist") || msg.includes("Could not find the table")) {
        return NextResponse.json({ landingPages: [] }, { status: 200 });
      }
      return NextResponse.json(
        { error: msg, landingPages: [] },
        { status: 400 }
      );
    }

    return NextResponse.json({ landingPages: data || [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch landing pages", landingPages: [] },
      { status: 500 }
    );
  }
}
