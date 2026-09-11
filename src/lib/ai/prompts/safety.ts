export function moderateContentPrompt(content: string): string {
  return `Evalúa el siguiente contenido para moderación de redes sociales:

"${content}"

Verifica si el contenido viola alguna de estas categorías:
- HATE: discurso de odio, discriminación, racismo, homofobia, etc.
- VIOLENCE: amenazas, glorificación de la violencia, contenido gráfico
- SEXUAL: contenido sexual explícito, acoso,objectificación
- FRAUD: estafas, phishing, información engañosa
- SPAM: contenido spam, repetitivo, promociones engañosas
- ILLEGAL: actividades ilegales, drogas, armas, etc.
- DUBIOUS: afirmaciones no verificadas, teorías conspirativas, desinformación

Responde con JSON:
{
  "safe": true/false,
  "risk_level": "NONE|LOW|MEDIUM|HIGH|CRITICAL",
  "categories": ["categoría1"],
  "reasons": ["razón1"],
  "suggestion": "sugerencia de mejora si aplica"
}`;
}
