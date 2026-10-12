import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  BP_OAUTH_PLATFORM,
  BP_SCOPES,
  REFRESH_LOCK_MS,
  buildCodeExchangeBody,
  buildRefreshBody,
  getClientId,
  isExpiringSoon,
  normalizeTokenResponse,
  type BpTokenResponse,
  type StoredBpTokens,
} from "./oauth-core";

/**
 * OAuth 2.0 (RFC 7591/7636) contra el issuer de la API REST de BulkPublish:
 *   issuer          https://app.bulkpublish.com
 *   authorize       /oauth/authorize
 *   token           /api/oauth/token
 *   revoke          /api/oauth/revoke
 * Descubierto en /.well-known/oauth-authorization-server. Cliente PUBLICO
 * (token_endpoint_auth_methods incluye "none"): no hay client_secret y todo el
 * intercambio se protege con PKCE S256, que BulkPublish exige.
 *
 * Tokens: access `bpat_...` (1h) y refresh `bprt_...` (30 días, ROTATIVO).
 * Presentar dos veces un refresh token revoca toda la autorización (OAuth 2.1),
 * por eso el refresh usa lock atómico en Supabase y se persiste apenas llega.
 *
 * Alcance de los tokens OAuth: posts, schedules, labels, media, Inbox, analytics,
 * uso de cuota y lectura de canales. La administración de cuenta (equipo,
 * organizaciones, billing, API keys, gestión de apps OAuth) devuelve 403 para
 * cualquier token OAuth, así que esas llamadas siguen con BULKPUBLISH_API_KEY.
 *
 * La parte pura (PKCE, URLs, cuerpos, normalización) vive en ./oauth-core para
 * poder testearla con node --test sin resolver el alias @/ del runtime Next.
 */

// Re-export de la parte pura: un solo punto de importación para el resto de la app.
export {
  BP_AUTHORIZE_URL,
  BP_TOKEN_URL,
  BP_REVOKE_URL,
  BP_SCOPES,
  BP_OAUTH_PLATFORM,
  REFRESH_MARGIN_MS,
  REFRESH_LOCK_MS,
  getClientId,
  getRedirectUri,
  generatePkce,
  generateState,
  buildAuthorizeUrl,
  buildCodeExchangeBody,
  buildRefreshBody,
  normalizeTokenResponse,
  isExpiringSoon,
} from "./oauth-core";
export type { PkcePair, BpTokenResponse, StoredBpTokens } from "./oauth-core";

const ZERO_USER = "00000000-0000-0000-0000-000000000000";

// ---------------------------------------------------------------------------
// Persistencia en social_accounts (platform = bulkpublish_oauth)
// ---------------------------------------------------------------------------

interface TokenRow {
  id: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
  display_name: string | null;
  channel_id: string | null;
  status: string | null;
}

function toTokens(row: TokenRow): StoredBpTokens | null {
  if (!row.access_token) return null;
  if (row.status === "revoked" || row.status === "error") return null;
  return {
    accessToken: row.access_token,
    refreshToken: row.refresh_token || "",
    expiresAt: typeof row.expires_at === "number" ? row.expires_at : 0,
    scope: row.display_name || undefined,
  };
}

export async function saveTokens(tokens: StoredBpTokens): Promise<void> {
  const supabase = getSupabaseAdmin();
  const now = Date.now();
  // Sin constraint única en (user_id, platform): limpiar filas viejas antes.
  await supabase
    .from("social_accounts")
    .delete()
    .eq("platform", BP_OAUTH_PLATFORM)
    .eq("user_id", ZERO_USER);
  await supabase.from("social_accounts").insert({
    user_id: ZERO_USER,
    platform: BP_OAUTH_PLATFORM,
    channel_name: "BulkPublish OAuth",
    channel_id: "", // lock libre
    display_name: tokens.scope || BP_SCOPES,
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expires_at: tokens.expiresAt,
    status: "active",
    connected_at: now,
    updated_at: now,
  });
}

export async function clearTokens(): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("social_accounts")
    .delete()
    .eq("platform", BP_OAUTH_PLATFORM)
    .eq("user_id", ZERO_USER);
}

async function readRow(): Promise<TokenRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("social_accounts")
    .select("id, access_token, refresh_token, expires_at, display_name, channel_id, status")
    .eq("platform", BP_OAUTH_PLATFORM)
    .eq("user_id", ZERO_USER)
    .limit(1);
  if (error || !data || !data.length) return null;
  return data[0] as TokenRow;
}

export interface BpOAuthStatus {
  clientIdConfigured: boolean;
  redirectUri: string;
  connected: boolean;
  accessTokenPresent: boolean;
  refreshTokenPresent: boolean;
  expiresAt: number | null;
  expiresInMin: number | null;
  expiringSoon: boolean;
  scope: string | null;
  status: string | null;
}

export async function getOAuthStatus(): Promise<BpOAuthStatus> {
  const row = await readRow();
  const tokens = row ? toTokens(row) : null;
  const now = Date.now();
  const expiresAt = tokens?.expiresAt ?? null;
  return {
    clientIdConfigured: !!getClientId(),
    redirectUri: (await import("./oauth-core")).getRedirectUri(),
    connected: !!tokens,
    accessTokenPresent: !!tokens?.accessToken,
    refreshTokenPresent: !!tokens?.refreshToken,
    expiresAt,
    expiresInMin: expiresAt ? Math.round((expiresAt - now) / 60000) : null,
    expiringSoon: expiresAt ? isExpiringSoon(expiresAt, now) : false,
    scope: row?.display_name || null,
    status: row?.status || null,
  };
}

// ---------------------------------------------------------------------------
// Intercambio y refresh
// ---------------------------------------------------------------------------

async function postToken(url: string, body: URLSearchParams): Promise<BpTokenResponse> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });
  const text = await res.text();
  let data: BpTokenResponse & { error?: string; error_description?: string } = {};
  try {
    data = text ? (JSON.parse(text) as BpTokenResponse) : {};
  } catch {
    throw new Error(`BulkPublish OAuth ${res.status}: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const desc = (data as { error_description?: string }).error_description || "";
    const err = (data as { error?: string }).error || "";
    throw new Error(`BulkPublish OAuth ${res.status}: ${err} ${desc}`.trim());
  }
  return data;
}

/** Intercambia el code del callback por tokens y los persiste. */
export async function exchangeCode(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  clientId: string;
}): Promise<StoredBpTokens> {
  const data = await postToken(BP_TOKEN_URL_LOCAL, buildCodeExchangeBody(params));
  const tokens = normalizeTokenResponse(data);
  if (!tokens) throw new Error("BulkPublish OAuth: respuesta sin access_token");
  await saveTokens(tokens);
  return tokens;
}

// El token endpoint, importado como valor para no depender del re-export.
const BP_TOKEN_URL_LOCAL = "https://app.bulkpublish.com/api/oauth/token";
const BP_REVOKE_URL_LOCAL = "https://app.bulkpublish.com/api/oauth/revoke";

/**
 * Intenta revocar el refresh token en BulkPublish. Si el endpoint falla, se
 * borra igual el guardado local: el objetivo es desconectar, no verificar.
 */
export async function revokeAndClear(): Promise<{ revoked: boolean; cleared: boolean }> {
  const row = await readRow();
  const tokens = row ? toTokens(row) : null;
  let revoked = false;
  if (tokens?.refreshToken || tokens?.accessToken) {
    try {
      const clientId = getClientId();
      const res = await fetch(BP_REVOKE_URL_LOCAL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          token: tokens.refreshToken || tokens.accessToken,
          ...(clientId ? { client_id: clientId } : {}),
        }).toString(),
      });
      revoked = res.ok;
    } catch {
      revoked = false;
    }
  }
  await clearTokens();
  return { revoked, cleared: true };
}

// Lock atómico: solo una instancia serverless refresca. Usa channel_id como
// timestamp del lock; se reclama con un update condicional (compare-and-set).
async function claimRefreshLock(): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const now = Date.now();
  const stale = String(now - REFRESH_LOCK_MS);
  const { data } = await supabase
    .from("social_accounts")
    .update({ channel_id: String(now), updated_at: now })
    .eq("platform", BP_OAUTH_PLATFORM)
    .eq("user_id", ZERO_USER)
    .or(`channel_id.is.null,channel_id.lt.${stale}`)
    .select("id");
  return !!(data && data.length);
}

async function releaseRefreshLock(): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("social_accounts")
    .update({ channel_id: "", updated_at: Date.now() })
    .eq("platform", BP_OAUTH_PLATFORM)
    .eq("user_id", ZERO_USER);
}

/**
 * Devuelve un access token válido, refrescando si venció (o está por vencer).
 * Devuelve null si no hay autorización o el refresh ya no sirve (invalid_grant):
 * en ese caso el caller cae a BULKPUBLISH_API_KEY.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const clientId = getClientId();
  if (!clientId) return null;

  let row = await readRow();
  let tokens = row ? toTokens(row) : null;
  if (!tokens) return null;

  const now = Date.now();
  if (!isExpiringSoon(tokens.expiresAt, now) && tokens.expiresAt > now) {
    return tokens.accessToken;
  }
  if (!tokens.refreshToken) return tokens.accessToken;

  // Un solo refresh por vez: sin esto, dos refresh con el mismo token rotativo
  // revocan TODA la autorización en BulkPublish.
  const locked = await claimRefreshLock();
  if (!locked) {
    // Otra instancia está refrescando: esperar y releer.
    await new Promise((r) => setTimeout(r, 2000));
    row = await readRow();
    tokens = row ? toTokens(row) : null;
    if (tokens && !isExpiringSoon(tokens.expiresAt)) return tokens.accessToken;
    return null;
  }

  try {
    row = await readRow();
    tokens = row ? toTokens(row) : null;
    if (!tokens) return null;
    // Releer tras tomar el lock: si ya estaba fresco, no gastar el refresh.
    if (!isExpiringSoon(tokens.expiresAt) && tokens.expiresAt > Date.now()) {
      return tokens.accessToken;
    }

    const data = await postToken(
      BP_TOKEN_URL_LOCAL,
      buildRefreshBody({ refreshToken: tokens.refreshToken, clientId })
    );
    const fresh = normalizeTokenResponse(data, Date.now());
    if (!fresh) throw new Error("BulkPublish OAuth refresh: sin access_token");
    await saveTokens({
      accessToken: fresh.accessToken,
      // Rotación: si no viene refresh nuevo, conservar el anterior (sigue válido
      // hasta su vencimiento; nunca reutilizar uno ya rotado).
      refreshToken: fresh.refreshToken || tokens.refreshToken,
      expiresAt: fresh.expiresAt,
      scope: fresh.scope || tokens.scope,
    });
    return fresh.accessToken;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // invalid_grant => refresh revocado/vencido: desconectar y avisar.
    if (/invalid_grant|revoked/i.test(msg)) {
      await clearTokens();
    }
    return null;
  } finally {
    await releaseRefreshLock();
  }
}
