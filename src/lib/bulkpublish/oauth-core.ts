import { createHash, randomBytes } from "crypto";

/**
 * Parte PURA del OAuth de BulkPublish: constantes, PKCE (S256), construcción de
 * URLs/cuerpos y normalización de la respuesta del token endpoint.
 *
 * Vive separada de oauth.ts a propósito: no importa Supabase ni fetch, así se
 * puede testear con `node --test` sin resolver el alias @/ del runtime Next.
 */

const BASE_URL = "https://app.bulkpublish.com";
export const BP_AUTHORIZE_URL = `${BASE_URL}/oauth/authorize`;
export const BP_TOKEN_URL = `${BASE_URL}/api/oauth/token`;
export const BP_REVOKE_URL = `${BASE_URL}/api/oauth/revoke`;

/** Scopes: lo que la app usa (crear/publicar/borrar posts, canales, media) más
 *  analytics:read para alimentar el loop de aprendizaje (analytics_daily hoy
 *  vacío). Nada de inbox ni full: se pide lo mínimo necesario. */
export const BP_SCOPES = [
  "posts:read",
  "posts:write",
  "media:read",
  "media:write",
  "channels:read",
  "analytics:read",
].join(" ");

/** Plataforma reservada en social_accounts para esta autorización. */
export const BP_OAUTH_PLATFORM = "bulkpublish_oauth";

/** Seguridad: se renueva recién vencido (o por vencer) para minimizar el uso
 *  del refresh token rotativo. */
export const REFRESH_MARGIN_MS = 60_000;
/** Duración del lock de refresh entre instancias serverless. */
export const REFRESH_LOCK_MS = 30_000;

export function getClientId(): string {
  return (process.env.BULKPUBLISH_CLIENT_ID || "").trim();
}

/** URI de redirección. Debe coincidir byte a byte con la registrada en la app. */
export function getRedirectUri(): string {
  return (
    (process.env.BULKPUBLISH_REDIRECT_URI || "").trim() ||
    "https://autopublicador-zeta.vercel.app/api/auth/bulkpublish/callback"
  );
}

// ---------------------------------------------------------------------------
// PKCE (S256)
// ---------------------------------------------------------------------------

export interface PkcePair {
  verifier: string;
  challenge: string;
}

/** Verifier de 48 bytes -> 64 chars base64url (RFC 7636 exige 43..128). */
export function generatePkce(): PkcePair {
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function generateState(): string {
  return randomBytes(24).toString("base64url");
}

// ---------------------------------------------------------------------------
// URLs y cuerpos (puros, sin red)
// ---------------------------------------------------------------------------

export function buildAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  scope?: string;
}): string {
  const url = new URL(BP_AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("scope", params.scope ?? BP_SCOPES);
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

/** Cuerpo x-www-form-urlencoded del intercambio authorization_code -> tokens. */
export function buildCodeExchangeBody(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  clientId: string;
}): URLSearchParams {
  return new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    code_verifier: params.codeVerifier,
    redirect_uri: params.redirectUri,
    client_id: params.clientId,
  });
}

export function buildRefreshBody(params: {
  refreshToken: string;
  clientId: string;
}): URLSearchParams {
  return new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: params.refreshToken,
    client_id: params.clientId,
  });
}

export interface BpTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}

export interface StoredBpTokens {
  accessToken: string;
  refreshToken: string;
  /** epoch ms en que vence el access token. */
  expiresAt: number;
  scope?: string;
}

/** Normaliza la respuesta del token endpoint (acepta snake_case de la API). */
export function normalizeTokenResponse(
  data: BpTokenResponse,
  now: number = Date.now()
): StoredBpTokens | null {
  if (!data || typeof data.access_token !== "string" || !data.access_token) return null;
  const expiresIn =
    typeof data.expires_in === "number" && Number.isFinite(data.expires_in)
      ? data.expires_in
      : 3600;
  return {
    accessToken: data.access_token,
    // En una rotación puede venir vacío: en ese caso el caller conserva el previo.
    refreshToken:
      typeof data.refresh_token === "string" && data.refresh_token ? data.refresh_token : "",
    expiresAt: now + expiresIn * 1000,
    scope: typeof data.scope === "string" ? data.scope : undefined,
  };
}

export function isExpiringSoon(expiresAt: number, now: number = Date.now()): boolean {
  return expiresAt - now <= REFRESH_MARGIN_MS;
}
