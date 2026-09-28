import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Sube una imagen al bucket público `media` y devuelve su URL.
 * Se usa desde la edición de campañas (imágenes propias para posts/videos).
 */
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Falta el archivo (campo 'file')" }, { status: 400 });
    }
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json(
        { error: "Formato no soportado (jpg, png, webp o gif)" },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Imagen demasiado grande (máx 10MB)" }, { status: 413 });
    }

    const ext = /png|jpe?g|webp|gif/i.exec(file.type)?.[0]?.toLowerCase() || "jpg";
    const safe = (form.get("name")?.toString() || "imagen")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40);
    const path = `campaigns/${Date.now()}-${safe || "imagen"}.${ext}`;

    const supabase = getSupabaseAdmin();
    const bytes = Buffer.from(await file.arrayBuffer());

    const { error } = await supabase.storage.from("media").upload(path, bytes, {
      contentType: file.type,
      upsert: false,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const { data } = supabase.storage.from("media").getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al subir" },
      { status: 500 }
    );
  }
}
