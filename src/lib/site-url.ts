/**
 * URL base del propio app (para callbacks OAuth, thumbnails internas, etc).
 *
 * NO confundir con la URL del sitio de la campaña que se usa en los CTAs:
 * esa vive en `src/lib/ai/copywriter.ts` (`getSiteUrl` / `DEFAULT_SITE_URL`).
 *
 * Históricamente este dominio estaba hardcodeado en 9 archivos. Ahora es
 * configurable para poder migrar de hosting sin tocar código:
 *
 *   NEXT_PUBLIC_APP_URL  -> prioridad (ya la usan los adapters sociales)
 *   APP_URL              -> respaldo (config.appUrl)
 *
 * El fallback conserva el dominio actual para que nada se rompa si el env
 * no está seteado: el comportamiento en producción es idéntico al previo.
 */
export const LEGACY_SITE_URL = "https://autopublicador-zeta.vercel.app";

/** Devuelve la URL base del app sin barra final. */
export function getBaseUrl(): string {
  const raw = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    LEGACY_SITE_URL
  ).trim();

  if (!raw) return LEGACY_SITE_URL;

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProtocol.replace(/\/+$/, "");
}

/** URL absoluta a partir de un path ("/api/x" -> "https://dominio/api/x"). */
export function absoluteUrl(path: string): string {
  const base = getBaseUrl();
  if (!path) return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
