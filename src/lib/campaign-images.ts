import { getSupabaseAdmin } from "@/lib/supabase/server";

// La tabla campaigns no tiene columna de imágenes (no hay DDL disponible desde
// la API), así que se guardan en una fila JSON de social_accounts, igual que
// el resto de estado interno.
const PLATFORM_KEY = "campaign_images";
const USER_ID = "00000000-0000-0000-0000-000000000000";

export type CampaignImages = Record<string, string[]>;

async function readAll(): Promise<CampaignImages> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("social_accounts")
      .select("access_token")
      .eq("platform", PLATFORM_KEY)
      .eq("user_id", USER_ID)
      .limit(10);

    const merged: CampaignImages = {};
    for (const row of data || []) {
      try {
        const parsed = JSON.parse(row.access_token || "{}") as CampaignImages;
        for (const [k, v] of Object.entries(parsed)) {
          if (Array.isArray(v)) merged[k] = v.filter((u) => typeof u === "string" && u);
        }
      } catch {}
    }
    return merged;
  } catch {
    return {};
  }
}

export async function getCampaignImages(campaignId: string): Promise<string[]> {
  if (!campaignId) return [];
  const all = await readAll();
  return all[campaignId] || [];
}

export async function getAllCampaignImages(): Promise<CampaignImages> {
  return readAll();
}

export async function setCampaignImages(
  campaignId: string,
  urls: string[]
): Promise<void> {
  const all = await readAll();
  const clean = (urls || []).filter((u) => typeof u === "string" && u).slice(0, 12);
  if (clean.length > 0) all[campaignId] = clean;
  else delete all[campaignId];

  const supabase = getSupabaseAdmin();
  await supabase
    .from("social_accounts")
    .delete()
    .eq("platform", PLATFORM_KEY)
    .eq("user_id", USER_ID);
  await supabase.from("social_accounts").insert({
    platform: PLATFORM_KEY,
    user_id: USER_ID,
    channel_name: "Campaign images",
    access_token: JSON.stringify(all),
    status: "active",
    connected_at: Date.now(),
    updated_at: Date.now(),
  });
}

/** Elige una imagen de la campaña de forma rotativa (si no hay, null). */
export function pickCampaignImage(images: string[]): string | null {
  if (!images || images.length === 0) return null;
  return images[Math.floor(Math.random() * images.length)];
}
