import { NextRequest, NextResponse } from "next/server";
import {
  buildAuthorizeUrl,
  getClientId,
  getRedirectUri,
  getOAuthStatus,
  generatePkce,
  generateState,
  revokeAndClear,
} from "@/lib/bulkpublish/oauth";

/**
 * GET /api/auth/bulkpublish
 *   Inicia el flujo OAuth 2.0 + PKCE S256 contra BulkPublish. Guarda el
 *   code_verifier y el state en una cookie httpOnly (10 min) y redirige al
 *   consentimiento del usuario.
 *   ?disconnect=1  -> revoca el token en BulkPublish y borra el guardado.
 *   ?status=1      -> devuelve el estado de la conexión (JSON).
 */

const COOKIE_NAME = "bp_oauth_flow";
const COOKIE_MAX_AGE = 600; // 10 min

interface FlowState {
  verifier: string;
  state: string;
}

function readFlowCookie(request: NextRequest): FlowState | null {
  const raw = request.cookies.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as FlowState;
    if (typeof parsed.verifier !== "string" || typeof parsed.state !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  // Desconexión explícita.
  if (url.searchParams.get("disconnect") === "1") {
    const result = await revokeAndClear();
    const back = NextResponse.redirect(
      new URL("/settings?bulkpublish_disconnected=1", request.url)
    );
    back.cookies.delete(COOKIE_NAME);
    return back;
  }

  // Estado de la conexión (para settings / diag).
  if (url.searchParams.get("status") === "1") {
    return NextResponse.json(await getOAuthStatus());
  }

  const clientId = getClientId();
  if (!clientId) {
    return NextResponse.json(
      {
        error: "BULKPUBLISH_CLIENT_ID no configurado",
        hint: "Registrá la app OAuth en BulkPublish y guardá el client_id en el env.",
      },
      { status: 500 }
    );
  }

  const redirectUri = getRedirectUri();
  const state = generateState();
  const { verifier, challenge } = generatePkce();

  const authorizeUrl = buildAuthorizeUrl({
    clientId,
    redirectUri,
    state,
    codeChallenge: challenge,
  });

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(COOKIE_NAME, JSON.stringify({ verifier, state } satisfies FlowState), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/auth/bulkpublish",
    maxAge: COOKIE_MAX_AGE,
  });
  return response;
}

export { readFlowCookie };
