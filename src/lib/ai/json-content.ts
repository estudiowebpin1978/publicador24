/**
 * Lectura del JSON que devuelve el modelo para armar una publicación.
 *
 * El modelo no siempre cumple el contrato: a veces mete texto antes o después
 * del JSON, a veces se queda sin tokens y la respuesta queda cortada a mitad
 * del objeto, y a veces cambia los nombres de los campos (`caption` en vez de
 * `body`). Antes eso tiraba la publicación entera y se perdía un turno de IA
 * y de publicación; acá se intenta rescatar lo que se pueda usar.
 */

export function parseJsonContent<T>(text: string): T | null {
  if (!text) return null;
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "");
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      // JSON mal cerrado o con basura: se intenta rescatar campo por campo.
    }
  }
  return salvageJsonFields(cleaned) as T | null;
}

/**
 * Reconstruye los campos de un JSON que quedó cortado a mitad de la respuesta
 * (le pasa al modelo cuando se queda sin tokens): lee los pares clave/valor que
 * estén completos aunque falte el cierre del objeto.
 */
export function salvageJsonFields(text: string): Record<string, unknown> | null {
  const out: Record<string, unknown> = {};
  const strPair = /"([a-zA-Z0-9_]+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let m: RegExpExecArray | null = null;
  while ((m = strPair.exec(text)) !== null) {
    if (out[m[1]] !== undefined) continue;
    try {
      out[m[1]] = JSON.parse(`"${m[2]}"`);
    } catch {
      out[m[1]] = m[2];
    }
  }
  const arrPair = /"([a-zA-Z0-9_]+)"\s*:\s*\[([^\]]*)\]/g;
  while ((m = arrPair.exec(text)) !== null) {
    if (out[m[1]] !== undefined) continue;
    try {
      out[m[1]] = JSON.parse(`[${m[2]}]`);
    } catch {
      // Array cortado o inválido: no rompe el resto del rescate.
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * La IA no siempre devuelve el mismo JSON: a veces manda `caption` en vez de
 * `body` o se olvida el `hook`. En vez de tirar el post (y la llamada a la IA
 * que ya costó hasta 25s) se normaliza y, si falta el gancho, se toma la
 * primera línea del cuerpo.
 */
export function normalizePostContent(raw: {
  hook?: string;
  title?: string;
  body?: string;
  caption?: string;
  text?: string;
  cta?: string;
  hashtags?: string[];
  tags?: string[];
} | null): { hook: string; body: string; cta: string; hashtags: string[] } | null {
  if (!raw || typeof raw !== "object") return null;
  const body = String(raw.body || raw.caption || raw.text || "").trim();
  const hook = String(raw.hook || raw.title || "").trim();
  const firstLine =
    body
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 0) || "";
  const finalHook = hook || firstLine.slice(0, 90);
  if (!finalHook && !body) return null;
  const hashtags = (raw.hashtags || raw.tags || []).filter(
    (h): h is string => typeof h === "string" && h.trim().length > 0
  );
  return {
    hook: finalHook,
    body,
    cta: String(raw.cta || "").trim(),
    hashtags,
  };
}
