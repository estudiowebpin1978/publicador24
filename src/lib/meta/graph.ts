const GRAPH_URL = "https://graph.facebook.com/v21.0";

const TOKENS_PLATFORM = "meta_tokens";
const TOKENS_USER = "00000000-0000-0000-0000-000000000000";

interface MetaConfig {
  pageId: string;
  pageAccessToken: string;
  instagramBusinessId?: string;
}

let memConfig: MetaConfig | null = null;
let memLoaded = false;

function envConfig(): MetaConfig | null {
  const pageId = process.env.META_PAGE_ID;
  const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN;
  if (!pageId || !pageAccessToken) return null;
  return {
    pageId,
    pageAccessToken,
    instagramBusinessId: process.env.META_INSTAGRAM_BUSINESS_ID || undefined,
  };
}

async function dbConfig(): Promise<MetaConfig | null> {
  try {
    const { getSupabaseAdmin } = await import("@/lib/supabase/server");
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("social_accounts")
      .select("access_token")
      .eq("platform", TOKENS_PLATFORM)
      .eq("user_id", TOKENS_USER)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (!data || data.length === 0) return null;
    const parsed = JSON.parse(data[0].access_token || "{}");
    if (!parsed.pageId || !parsed.pageAccessToken) return null;
    return {
      pageId: String(parsed.pageId),
      pageAccessToken: String(parsed.pageAccessToken),
      instagramBusinessId: parsed.instagramBusinessId || undefined,
    };
  } catch {
    return null;
  }
}

export async function getMetaConfigAsync(): Promise<MetaConfig | null> {
  if (!memLoaded) {
    memLoaded = true;
    memConfig = (await dbConfig()) || envConfig();
  }
  return memConfig || envConfig();
}

export async function saveMetaTokens(config: MetaConfig): Promise<void> {
  const { getSupabaseAdmin } = await import("@/lib/supabase/server");
  const supabase = getSupabaseAdmin();
  await supabase
    .from("social_accounts")
    .delete()
    .eq("platform", TOKENS_PLATFORM)
    .eq("user_id", TOKENS_USER);
  await supabase.from("social_accounts").insert({
    platform: TOKENS_PLATFORM,
    user_id: TOKENS_USER,
    channel_name: "Meta Tokens",
    access_token: JSON.stringify(config),
    status: "active",
    connected_at: Date.now(),
    updated_at: Date.now(),
  });
  memConfig = config;
  memLoaded = true;
}

export function invalidateMetaConfig() {
  memConfig = null;
  memLoaded = false;
  fbScopesCache = null;
}

let fbScopesCache: { checkedAt: number; granted: boolean } | null = null;

/**
 * ¿El token de Meta permite publicar en la página de Facebook?
 *
 * Publicar exige pages_manage_posts además de pages_read_engagement: sin ese
 * permiso la API responde (#200)/(#240) y cada intento solo gasta una llamada
 * a la IA y deja un backoff, sin publicar nada. Se consulta una vez cada 6 h y
 * se cachea en memoria, así el ciclo no paga ese viaje en cada pasada.
 */
export async function canPublishToFacebook(): Promise<boolean> {
  if (fbScopesCache && Date.now() - fbScopesCache.checkedAt < 6 * 3_600_000) {
    return fbScopesCache.granted;
  }
  try {
    const config = await getMetaConfigAsync();
    if (!config?.pageAccessToken) {
      fbScopesCache = { checkedAt: Date.now(), granted: false };
      return false;
    }
    const res = await fetch(
      `https://graph.facebook.com/v21.0/debug_token?` +
        `input_token=${encodeURIComponent(config.pageAccessToken)}` +
        `&access_token=${process.env.META_APP_ID}|${process.env.META_APP_SECRET}`,
      { signal: AbortSignal.timeout(10_000) }
    );
    const data = await res.json();
    const scopes: string[] = data?.data?.scopes || [];
    const granted = scopes.includes("pages_manage_posts");
    fbScopesCache = { checkedAt: Date.now(), granted };
    return granted;
  } catch {
    // Sin confirmar no se arriesga el intento: se mantiene el último valor.
    return fbScopesCache?.granted ?? false;
  }
}

export function isMetaConfigured(): boolean {
  return memConfig !== null || envConfig() !== null;
}

export async function isMetaConfiguredAsync(): Promise<boolean> {
  return (await getMetaConfigAsync()) !== null;
}

async function graphFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${GRAPH_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const json = await res.json();
  if (json.error) {
    throw new Error(`Meta Graph: ${json.error.message} (code ${json.error.code})`);
  }
  return json as T;
}

export async function publishToFacebook(
  message: string,
  link?: string,
  imageUrl?: string
): Promise<{ id: string; url?: string }> {
  const config = await getMetaConfigAsync();
  if (!config) throw new Error("Meta no configurado (META_PAGE_ID / META_PAGE_ACCESS_TOKEN)");

  if (imageUrl) {
    const photo = await graphFetch<{ id: string }>(
      `/${config.pageId}/photos?access_token=${config.pageAccessToken}`,
      {
        method: "POST",
        body: JSON.stringify({ url: imageUrl, message, published: true }),
      }
    );
    return { id: photo.id, url: `https://www.facebook.com/${photo.id}` };
  }

  const body: Record<string, unknown> = { message, published: true };
  if (link) body.link = link;

  const post = await graphFetch<{ id: string }>(
    `/${config.pageId}/feed?access_token=${config.pageAccessToken}`,
    { method: "POST", body: JSON.stringify(body) }
  );
  return { id: post.id, url: `https://www.facebook.com/${post.id}` };
}

export async function publishToInstagram(
  caption: string,
  imageUrl: string
): Promise<{ id: string }> {
  const config = await getMetaConfigAsync();
  if (!config) throw new Error("Meta no configurado");
  if (!config.instagramBusinessId) {
    console.warn("[Meta] Instagram Business ID no configurado, saltando Instagram");
    return { id: "skipped" };
  }

  const container = await graphFetch<{ id: string }>(
    `/${config.instagramBusinessId}/media?access_token=${config.pageAccessToken}`,
    {
      method: "POST",
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
      }),
    }
  );

  await sleep(1500);

  const published = await graphFetch<{ id: string }>(
    `/${config.instagramBusinessId}/media_publish?access_token=${config.pageAccessToken}`,
    {
      method: "POST",
      body: JSON.stringify({ creation_id: container.id }),
    }
  );

  return { id: published.id };
}

export async function getMetaPages(userToken: string): Promise<{ id: string; name: string; access_token: string }[]> {
  const data = await graphFetch<{ data: { id: string; name: string; access_token: string }[] }>(
    `/me/accounts?access_token=${userToken}`
  );
  return data.data;
}

export async function getInstagramBusinessId(pageId: string, pageToken: string): Promise<string | null> {
  try {
    const data = await graphFetch<{ instagram_business_account?: { id: string } }>(
      `/${pageId}?fields=instagram_business_account&access_token=${pageToken}`
    );
    return data.instagram_business_account?.id || null;
  } catch {
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
