import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseJsonContent,
  salvageJsonFields,
  normalizePostContent,
} from "../src/lib/ai/json-content.ts";

const VALID = `{
  "hook": "El número que te quema la cabeza",
  "body": "Hoy sale la quiniela de la ciudad y muchos se quedan mirando el tablero.",
  "cta": "Entrá y armá tu jugada",
  "hashtags": ["#quiniela", "#loteria"]
}`;

test("parseJsonContent lee un JSON bien formado", () => {
  const parsed = parseJsonContent<{ hook: string; hashtags: string[] }>(VALID);
  assert.equal(parsed?.hook, "El número que te quema la cabeza");
  assert.deepEqual(parsed?.hashtags, ["#quiniela", "#loteria"]);
});

test("parseJsonContent ignora el texto alrededor del JSON", () => {
  const parsed = parseJsonContent<{ hook: string }>(`Acá va:\n${VALID}\n¡Suerte!`);
  assert.equal(parsed?.hook, "El número que te quema la cabeza");
});

test("parseJsonContent descarta un texto sin JSON", () => {
  assert.equal(parseJsonContent("hola, no tengo json para vos"), null);
  assert.equal(parseJsonContent(""), null);
});

test("salvageJsonFields rescata campos de un JSON cortado a mitad", () => {
  // Caso real: el modelo se queda sin tokens y la respuesta queda sin cerrar.
  const cut = `{
  "hook": "Sentís que el número te esquiva",
  "body": "La realidad es que la quiniela genera mucha información",
  "cta": "Entrá y mirá las pistas de hoy",
  "hashtags": ["#quiniela", "#na`;
  const salvaged = salvageJsonFields(cut);
  assert.equal(salvaged?.hook, "Sentís que el número te esquiva");
  assert.ok(String(salvaged?.body).includes("quiniela"));
  assert.ok(String(salvaged?.cta).includes("Entrá"));
  // El array quedó sin cerrar: no se rompe el resto del rescate.
  assert.equal(salvaged?.hashtags, undefined);
});

test("parseJsonContent devuelve el rescate cuando el JSON no cierra", () => {
  const parsed = parseJsonContent<{ hook: string; cta: string }>(
    `{ "hook": "Se cortó acá", "cta": "Andá a `
  );
  assert.equal(parsed?.hook, "Se cortó acá");
});

test("salvageJsonFields respeta el orden de los pares repetidos", () => {
  const salvaged = salvageJsonFields(`{"hook": "primero", "hook": "segundo"}`);
  assert.equal(salvaged?.hook, "primero");
});

test("normalizePostContent usa caption cuando no hay body", () => {
  const normalized = normalizePostContent({
    caption: "Este es el cuerpo del post",
    hook: "Gancho",
  });
  assert.equal(normalized?.body, "Este es el cuerpo del post");
  assert.equal(normalized?.hook, "Gancho");
});

test("normalizePostContent arma el hook desde la primera línea del body", () => {
  const normalized = normalizePostContent({ body: "Primera línea que engancha\nY acá sigue el desarrollo." });
  assert.equal(normalized?.hook, "Primera línea que engancha");
  assert.equal(normalized?.body, "Primera línea que engancha\nY acá sigue el desarrollo.");
});

test("normalizePostContent devuelve null sin hook ni body", () => {
  assert.equal(normalizePostContent(null), null);
  assert.equal(normalizePostContent({}), null);
  assert.equal(normalizePostContent({ hashtags: ["#a"] }), null);
});

test("normalizePostContent limpia hashtags vacíos y acepta tags", () => {
  const normalized = normalizePostContent({
    hook: "Gancho",
    hashtags: ["#quiniela", "", "   "],
  });
  assert.deepEqual(normalized?.hashtags, ["#quiniela"]);

  const fromTags = normalizePostContent({ hook: "Gancho", tags: ["#sorteo"] });
  assert.deepEqual(fromTags?.hashtags, ["#sorteo"]);
});
