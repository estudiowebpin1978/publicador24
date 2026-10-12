import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, getClientId, getRedirectUri } from "@/lib/bulkpublish/oauth";

/**
 * GET /api/auth/bulkpublish/callback
 *   Destino registrado de la autorización BulkPublish. Valida el state contra
 *   la cookie httpOnly guardada al iniciar, intercambia el code (PKCE S256)
 *   por los tokens, los persiste y vuelve a /settings.
 */

const COOKIE_NAME = "bp_oauth_flow";

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

function redirectToSettings(params: Record<string, string>): NextResponse {
  const target = new URL("/settings", "https://autopublicador-zeta.vercel.app");
  for (const [k, v] of Object.entries(params)) target.searchParams.set(k, v);
  return NextResponse.redirect(target);
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const flow = readFlowCookie(request);

  const response = NextResponse.redirect(
    new URL("/settings", request.url)
  );
  response.cookies.delete(COOKIE_NAME);

  // El usuario canceló en el consentimiento de BulkPublish.
  if (url.searchParams.get("error")) {
    const err = url.searchParams.get("error") || "unknown";
    const desc = url.searchParams.get("error_description") || "";
    return NextResponse.redirect(
      new URL(
        `/settings?bulkpublish_error=${encodeURIComponent(`${err}${desc ? `: ${desc}` : ""}`)}`,
        request.url
      )
    );
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!flow) {
    return NextResponse.redirect(
      new URL("/settings?bulkpublish_error=sesi%C3%B3n+perdida+(reintent%C3%A1)", request.url)
    );
  }
  if (!code) {
    return NextResponse.redirect(
      new URL("/settings?bulkpublish_error=sin+code", request.url)
    );
  }
  if (!state || state !== flow.state) {
    // State que no coincide => posible CSRF. No se intercambia el code.
    return NextResponse.redirect(
      new URL("/settings?bulkpublish_error=state+inv%C3%A1lido", request.url)
    );
  }

  const clientId = getClientId();
  if (!clientId) {
    return NextResponse.redirect(
      new URL("/settings?bulkpublish_error=sin+BULKPUBLISH_CLIENT_ID", request.url)
    );
  }

  try {
    await exchangeCode({
      code,
      codeVerifier: flow.verifier,
      redirectUri: getRedirectUri(),
      clientId,
    });
    const done = redirectToSettings({ bulkpublish_connected: "1" });
    done.cookies.delete(COOKIE_NAME);
    return done;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const failed = NextResponse.redirect(
      new URL(
        `/settings?bulkpublish_error=${encodeURIComponent(msg.slice(0, 200))}`,
        request.url
      )
    );
    failed.cookies.delete(COOKIE_NAME);
    return failed;
  }
}
