import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SITE_URL,
  buildPostPrompt,
  buildYouTubePrompt,
  buildCampaignContext,
  ensureSiteUrl,
  getSiteUrl,
  isLotteryCampaign,
  buildImagePrompt,
  COPYWRITER_SYSTEM,
} from "../src/lib/ai/copywriter.ts";
import { resolveMarketingCompliance } from "../src/lib/marketing/compliance.ts";

test("getSiteUrl usa la URL de la campaña o la por defecto", () => {
  assert.equal(getSiteUrl({ url: "https://ejemplo.com.ar" }), "https://ejemplo.com.ar");
  assert.equal(getSiteUrl({ url: "ejemplo.com.ar" }), "https://ejemplo.com.ar");
  assert.equal(getSiteUrl(undefined), DEFAULT_SITE_URL);
  assert.equal(getSiteUrl({ url: "   " }), DEFAULT_SITE_URL);
});

test("ensureSiteUrl agrega el sitio si la IA lo omitió", () => {
  const text = "Mirá esto, está buenísimo.";
  const withUrl = ensureSiteUrl(text, { url: "https://ejemplo.com" });
  assert.match(withUrl, /ejemplo\.com/);
});

test("ensureSiteUrl no duplica el sitio si ya está", () => {
  const text = "Entrá a https://ejemplo.com y mirá.";
  const result = ensureSiteUrl(text, { url: "https://ejemplo.com" });
  assert.equal(result, text);
});

test("el prompt de post usa el contexto de la campaña y no un nicho hardcodeado", () => {
  const prompt = buildPostPrompt("instagram", {
    name: "Piscinas del Sur",
    description: "Limpieza y mantenimiento de piscinas en Rosario",
    target_audience: "dueños de casa con piscina",
    url: "https://piscinasdelsur.com",
  });

  assert.match(prompt, /Piscinas del Sur/);
  assert.match(prompt, /limpieza y mantenimiento de piscinas/i);
  assert.match(prompt, /piscinasdelsur\.com/);
  assert.doesNotMatch(prompt, /loter[ií]a|quinela/i);
});

test("el prompt de post siempre pide la URL en la CTA", () => {
  const prompt = buildPostPrompt("tiktok", { name: "Otro negocio", url: "https://otro.com" });
  assert.match(prompt, /"cta"/);
  assert.match(prompt, /https:\/\/otro\.com/);
  assert.match(prompt, /hashtag/);
});

test("las reglas anti-IA están presentes en el system prompt", () => {
  assert.match(COPYWRITER_SYSTEM, /rioplatense/i);
  assert.match(COPYWRITER_SYSTEM, /sitio web/i);
  assert.match(COPYWRITER_SYSTEM, /Nunca suenas a IA/i);
  assert.doesNotMatch(COPYWRITER_SYSTEM, /https?:\/\//);
});

test("buildCampaignContext tolera campaña vacía", () => {
  const block = buildCampaignContext(undefined);
  assert.match(block, /CONTEXTO DE LA CAMPAÑA/);
  assert.match(block, new RegExp(DEFAULT_SITE_URL.replace(/[/.]/g, "\\$&")));
});

test("buildYouTubePrompt incluye el enlace y las reglas naturales", () => {
  const prompt = buildYouTubePrompt({ name: "Fit", url: "https://fitapp.com" });
  assert.match(prompt, /fitapp\.com/);
  assert.match(prompt, /thumbnail_prompt/);
  assert.doesNotMatch(prompt, /loter[ií]a|quinela/i);
});

test("isLotteryCampaign detecta sólo el nicho de quiniela", () => {
  assert.equal(isLotteryCampaign({ name: "Quiniela IA" }), true);
  assert.equal(isLotteryCampaign({ name: "Piscinas del Sur" }), false);
  assert.equal(isLotteryCampaign(undefined), false);
});

test("buildImagePrompt deriva la imagen de la campaña (o devuelve null)", () => {
  const prompt = buildImagePrompt("instagram", { description: "Café de especialidad en Córdoba" });
  assert.ok(prompt);
  assert.match(prompt!, /café de especialidad/i);
  assert.equal(buildImagePrompt("instagram", undefined), null);
});

test("ensureSiteUrl detecta el host sin protocolo ni www", () => {
  const text = "Entrá a quiniela-ia-two.vercel.app y probá.";
  assert.equal(ensureSiteUrl(text, { url: DEFAULT_SITE_URL }), text);
  const www = "Entrá a www.quiniela-ia-two.vercel.app y probá.";
  assert.equal(ensureSiteUrl(www, { url: DEFAULT_SITE_URL }), www);
});

test("ensureSiteUrl no acepta otra URL del mismo dominio raíz como presencia propia", () => {
  // Otra app en *.vercel.app no debería contar como "ya incluye nuestro sitio".
  const text = "Mirá este otro proyecto en https://otra-app.vercel.app";
  const result = ensureSiteUrl(text, { url: DEFAULT_SITE_URL });
  assert.match(result, /quiniela-ia-two\.vercel\.app/);
});

test("resolveMarketingCompliance: +18/disclaimer en nichos regulados y CTA con URL siempre", () => {
  const regulated = resolveMarketingCompliance("Pronósticos de la quiniela de Lanús");
  assert.equal(regulated.ageRestricted, true);
  assert.ok(regulated.disclaimer);
  assert.equal(regulated.ctaUrl, DEFAULT_SITE_URL);

  const free = resolveMarketingCompliance("Clases de yoga para principiantes");
  assert.equal(free.ageRestricted, false);
  assert.equal(free.disclaimer, undefined);
  assert.equal(free.ctaUrl, DEFAULT_SITE_URL);

  const forced = resolveMarketingCompliance("Yoga", { ctaUrl: "https://otro.com" });
  assert.equal(forced.ctaUrl, "https://otro.com");
  assert.equal(forced.ageRestricted, false);
});
