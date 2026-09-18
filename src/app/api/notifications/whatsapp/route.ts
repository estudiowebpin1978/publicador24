import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("whatsapp_notifications")
      .insert({
        message: body.message,
        type: body.type || "info",
        status: "pending",
        metadata: body.metadata || null,
        created_at: Date.now(),
      })
      .select()
      .single();

    if (error) {
      const msg = error.message || "";
      if (msg.includes("does not exist") || msg.includes("relation")) {
        return NextResponse.json({ notifications: [] });
      }
      throw error;
    }

    return NextResponse.json({ notification: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";
    const limit = parseInt(searchParams.get("limit") || "20");

    const { data, error } = await supabase
      .from("whatsapp_notifications")
      .select("*")
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      const msg = error.message || "";
      if (msg.includes("does not exist") || msg.includes("relation")) {
        return NextResponse.json({ notifications: [] });
      }
      throw error;
    }

    return NextResponse.json({ notifications: data || [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error", notifications: [] },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("whatsapp_notifications")
      .update({ status: body.status, updated_at: Date.now() })
      .eq("id", body.id);

    if (error) {
      const msg = error.message || "";
      if (msg.includes("does not exist") || msg.includes("relation")) {
        return NextResponse.json({ success: false, error: "Table not found" });
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
