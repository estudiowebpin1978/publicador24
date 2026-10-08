import { DEFAULT_SITE_URL } from '../ai/copywriter.ts';

/** Requisitos legales/por campaña. Aplica a nichos regulados (p. ej. +18). */
export interface MarketingCompliance {
  /** Agrega aviso de edad (+18) al caption. */
  ageRestricted?: boolean;
  /** Disclaimer obligatorio que se antepone al caption. */
  disclaimer?: string;
  /** URL de CTA que se agrega al final (p. ej. la del producto promocionado). */
  ctaUrl?: string;
}

// Palabras que activan el cumplimiento (+18 / disclaimer) por defecto.
const REGULATED_TERMS = /\b(quiniela|quinielas|loter[íi]a|lotto|apuestas|apostar|casino|bingo|gol\s+de\s+hoy|pron[óo]stico\s+de\s+apuestas)\b/i;

/**
 * Compliance compartido por los endpoints de marketing (generate y batch):
 * - nichos regulados activan +18 y disclaimer por defecto;
 * - el CTA siempre lleva URL (por defecto, la del sitio del producto), así
 *   toda pieza termina llevando tráfico al sitio.
 */
export function resolveMarketingCompliance(
  idea: string,
  raw?: MarketingCompliance,
  niche?: string
): MarketingCompliance {
  const regulated = REGULATED_TERMS.test(`${idea} ${niche || ""}`);
  return {
    ageRestricted: raw?.ageRestricted ?? regulated,
    disclaimer:
      raw?.disclaimer ??
      (regulated ? "Análisis estadístico. No garantiza resultados." : undefined),
    ctaUrl: raw?.ctaUrl ?? DEFAULT_SITE_URL,
  };
}
