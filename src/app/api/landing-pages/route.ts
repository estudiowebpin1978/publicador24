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

    const { data, error } = await supabase
      .from("landing_pages")
      .insert({
        campaign_id: campaignId || null,
        name,
        description: description || "",
        cta: cta || "Conocer mas",
        url: url || "",
        html,
        slug: name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, ""),
      })
      .select()
      .single();

    if (error) throw error;

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
    const { data, error } = await supabase
      .from("landing_pages")
      .select("id, campaign_id, name, description, cta, url, slug, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ landingPages: data || [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch landing pages", landingPages: [] },
      { status: 500 }
    );
  }
}
