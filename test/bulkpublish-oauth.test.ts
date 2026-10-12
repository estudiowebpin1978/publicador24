import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  generatePkce,
  generateState,
  buildAuthorizeUrl,
  buildCodeExchangeBody,
  buildRefreshBody,
  normalizeTokenResponse,
  isExpiringSoon,
  BP_SCOPES,
  BP_AUTHORIZE_URL,
  BP_TOKEN_URL,
} from "../src/lib/bulkpublish/oauth-core.ts";

test("generatePkce produce un verifier dentro del rango de RFC 7636", () => {
  const { verifier, challenge } = generatePkce();
  assert.ok(verifier.length >= 43 && verifier.length <= 128, `largo ${verifier.length}`);
  assert.match(verifier, /^[A-Za-z0-9_-]+$/, "base64url sin padding");
});

test("generatePkce calcula el challenge como S256 del verifier", () => {
  const { verifier, challenge } = generatePkce();
  const expected = createHash("sha256").update(verifier).digest("base64url");
  assert.equal(challenge, expected);
});

test("dos generatePkce seguidos no repiten verifier", () => {
  assert.notEqual(generatePkce().verifier, generatePkce().verifier);
});

test("generateState devuelve valores aleatorios", () => {
  assert.notEqual(generateState(), generateState());
  assert.ok(generateState().length >= 24);
});

test("buildAuthorizeUrl incluye todos los parámetros requeridos por BulkPublish", () => {
  const url = new URL(
    buildAuthorizeUrl({
      clientId: "bpc_test",
      redirectUri: "https://ejemplo.com/callback",
      state: "abc123",
      codeChallenge: "challenge_s256",
    })
  );
  assert.equal(url.origin + url.pathname, BP_AUTHORIZE_URL);
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("client_id"), "bpc_test");
  assert.equal(url.searchParams.get("redirect_uri"), "https://ejemplo.com/callback");
  assert.equal(url.searchParams.get("state"), "abc123");
  assert.equal(url.searchParams.get("code_challenge"), "challenge_s256");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("scope"), BP_SCOPES);
});

test("BP_SCOPES cubre lo que la app usa y no pide inbox ni full", () => {
  for (const needed of ["posts:write", "posts:read", "channels:read", "media:write"]) {
    assert.ok(BP_SCOPES.split(" ").includes(needed), `falta ${needed}`);
  }
  assert.ok(!BP_SCOPES.includes("full"));
  assert.ok(!BP_SCOPES.includes("inbox"));
});

test("buildCodeExchangeBody arma el form-encoded del authorization_code", () => {
  const body = buildCodeExchangeBody({
    code: "el_code",
    codeVerifier: "el_verifier",
    redirectUri: "https://ejemplo.com/cb",
    clientId: "bpc_1",
  });
  assert.equal(body.get("grant_type"), "authorization_code");
  assert.equal(body.get("code"), "el_code");
  assert.equal(body.get("code_verifier"), "el_verifier");
  assert.equal(body.get("redirect_uri"), "https://ejemplo.com/cb");
  assert.equal(body.get("client_id"), "bpc_1");
});

test("buildRefreshBody pide el refresh_token rotativo", () => {
  const body = buildRefreshBody({ refreshToken: "bprt_x", clientId: "bpc_1" });
  assert.equal(body.get("grant_type"), "refresh_token");
  assert.equal(body.get("refresh_token"), "bprt_x");
  assert.equal(body.get("client_id"), "bpc_1");
});

test("normalizeTokenResponse convierte la respuesta del token endpoint", () => {
  const now = 1_000_000;
  const t = normalizeTokenResponse(
    { access_token: "bpat_1", refresh_token: "bprt_1", expires_in: 3600, scope: "posts:write" },
    now
  );
  assert.ok(t);
  assert.equal(t.accessToken, "bpat_1");
  assert.equal(t.refreshToken, "bprt_1");
  assert.equal(t.expiresAt, now + 3600 * 1000);
  assert.equal(t.scope, "posts:write");
});

test("normalizeTokenResponse tolera expires_in ausente asumiendo 1h", () => {
  const now = 0;
  const t = normalizeTokenResponse({ access_token: "bpat_2" }, now);
  assert.ok(t);
  assert.equal(t.expiresAt, now + 3600 * 1000);
  // Sin refresh nuevo: el caller conserva el anterior.
  assert.equal(t.refreshToken, "");
});

test("normalizeTokenResponse devuelve null sin access_token", () => {
  assert.equal(normalizeTokenResponse({}), null);
  assert.equal(normalizeTokenResponse({ refresh_token: "solo" }), null);
  assert.equal(normalizeTokenResponse({ access_token: "" }), null);
});

test("isExpiringSoon marca el margen de 60s antes de vencer", () => {
  const now = 1_000_000;
  assert.equal(isExpiringSoon(now + 30_000, now), true);
  assert.equal(isExpiringSoon(now + 60_000, now), true);
  assert.equal(isExpiringSoon(now + 61_000, now), false);
  assert.equal(isExpiringSoon(now - 1, now), true, "ya vencido se refresca");
});

test("BP_TOKEN_URL apunta al token endpoint descubierto", () => {
  assert.equal(BP_TOKEN_URL, "https://app.bulkpublish.com/api/oauth/token");
});
