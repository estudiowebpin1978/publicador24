// Control único de "promesas prohibidas" compartido entre Next.js y Convex.
//
// Objetivo: bloquear promesas de ganancia garantizada y estadísticas de
// resultados inventadas (típicas de marketing de apuestas engañoso).
// NO bloquea análisis estadístico legítimo: solo frases que prometen
// resultados personales o atribuyen ganancias no verificables a usuarios.
//
// Convenciones:
// - Los patterns van SIN flag /g: `RegExp.test` con /g usa lastIndex y da
//   resultados distintos en llamadas consecutivas.
// - Se devuelve la etiqueta del conflicto para poder mostrar el motivo.

export interface ProhibitedClaim {
  /** Etiqueta corta, apta para mostrar en un reporte de seguridad. */
  readonly label: string;
  readonly pattern: RegExp;
}

export const PROHIBITED_CLAIMS: readonly ProhibitedClaim[] = [
  {
    label: "promesa de ganancia garantizada",
    pattern:
      /\b(gana[rs]?\s+(siempre|seguro|garantizad[oa]|sin fallar)|gan[áa]s?\s+(siempre|seguro|garantizado)|100\s*%\s*(seguro|garantizado|de\s+ganar))/i,
  },
  {
    label: "promesa de que no se puede perder",
    pattern: /\b(no\s+(pod[eé]s|pueden|vas)\s+perder|apuesta\s+segura|sin\s+riesgo\s+(de\s+perder|total))/i,
  },
  {
    label: "promesa de dinero fácil",
    pattern: /\b(dinero\s+f[áa]cil|hazte\s+rico|enr[ií]quete\s+y|ganar\s+plata\s+sin\s+hacer\s+nada)/i,
  },
  {
    label: "estadística de ganancias no verificable",
    pattern:
      /\b\d{1,3}\s*%\s*de\s+(nuestros\s+|los\s+)?(usuarios|clientes|jugadores|personas|gente)\b[^.!?]{0,60}\b(ganaron|gan[óo]\s+plata|acertaron|se\s+hicieron\s+ricos)/i,
  },
  {
    label: "garantía de resultados",
    pattern: /\bgarantizamos\s+(ganancias|resultados|premios|beneficios|rendimiento)/i,
  },
] as const;

/** Devuelve las etiquetas de promesas prohibidas encontradas ([] si no hay). */
export function findProhibitedClaims(text: string): string[] {
  if (!text) return [];
  const found: string[] = [];
  for (const claim of PROHIBITED_CLAIMS) {
    if (claim.pattern.test(text) && !found.includes(claim.label)) {
      found.push(claim.label);
    }
  }
  return found;
}

/** true si el texto contiene al menos una promesa prohibida. */
export function hasProhibitedClaim(text: string): boolean {
  return findProhibitedClaims(text).length > 0;
}
