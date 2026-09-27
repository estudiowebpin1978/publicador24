import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Datos para la tabla de Usuarios del dashboard.
 * La UI espera { success, data: { users: { list: [...] } } }.
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    let list: { id: string; email: string; name: string; created_at: string }[] = [];

    try {
      const { data, error } = await supabase.auth.admin.listUsers({ perPage: 50 });
      if (!error && data?.users) {
        list = data.users.map((u) => ({
          id: u.id,
          email: u.email || "",
          name:
            (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || "",
          created_at: u.created_at,
        }));
      }
    } catch {
      // auth.admin no disponible (clave con permisos limitados): devolvemos vacío
      // en vez de romper el dashboard.
    }

    if (list.length === 0) {
      try {
        const { data: rows, error } = await supabase
          .from("profiles")
          .select("id, email, name, created_at")
          .order("created_at", { ascending: false })
          .limit(50);
        if (!error && rows) {
          list = rows.map((r) => ({
            id: r.id,
            email: r.email || "",
            name: r.name || "",
            created_at: r.created_at ? String(r.created_at) : "",
          }));
        }
      } catch {}
    }

    return NextResponse.json({
      success: true,
      data: { users: { list } },
      total: list.length,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "error" },
      { status: 500 }
    );
  }
}
