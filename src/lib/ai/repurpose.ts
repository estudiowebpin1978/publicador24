import { generateTextWithFallback } from "@/lib/ai/multi-provider";

export async function repurposeToReels(content: { hook: string; body: string }): Promise<{ hook: string; script: string; duration: number }> {
  const result = await generateTextWithFallback(
    `Convertí este post a un guión de video corto (Reels/TikTok) de 5 a 15 segundos:

Hook: ${content.hook}
Cuerpo: ${content.body}

Formato JSON:
{
  "hook": "Primeros 2-3 segundos (gancho visual)",
  "script": "Guión con indicaciones de cámara, transiciones y texto en pantalla",
  "duration": 10
}

El script debe incluir:
- [CUT] para cortes
- [ZOOM] para zooms
- [TEXT] para texto en pantalla
- [TRANSITION] para transiciones`,
    "Sos un experto en video content para redes sociales. Español argentino. Respondé SOLO con el JSON."
  );

  try {
    const match = result.text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : { hook: content.hook, script: content.body, duration: 10 };
  } catch {
    return { hook: content.hook, script: content.body, duration: 10 };
  }
}

export async function repurposeToCarousel(content: { hook: string; body: string }): Promise<{ slides: { title: string; text: string; image: string }[] }> {
  const result = await generateTextWithFallback(
    `Convertí este post a un carrusel educativo de 5 slides:

Hook: ${content.hook}
Cuerpo: ${content.body}

Formato JSON:
{
  "slides": [
    {
      "title": "Título del slide (corto, impactante)",
      "text": "Texto explicativo (2-3 líneas máximo)",
      "image": "Descripción de imagen sugerida para este slide"
    }
  ]
}

Reglas:
- Slide 1: Hook principal + problema
- Slides 2-4: Contenido educativo paso a paso
- Slide 5: CTA + resumen`,
    "Sos un experto en diseño de carruseles para Instagram/TikTok. Español argentino. Respondé SOLO con el JSON."
  );

  try {
    const match = result.text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : { slides: [] };
  } catch {
    return { slides: [] };
  }
}

export async function repurposeToStory(content: { hook: string; body: string }): Promise<{ text: string; sticker: string; cta: string }> {
  const result = await generateTextWithFallback(
    `Convertí este post a formato Story (Instagram/Facebook):

Hook: ${content.hook}
Cuerpo: ${content.body}

Formato JSON:
{
  "text": "Texto principal para la story (máximo 2 líneas)",
  "sticker": "Tipo de sticker sugerido (poll, emoji slider, question, quiz)",
  "cta": "Call to action para swipe up o link"
}`,
    "Sos un experto en Stories para redes sociales. Español argentino. Respondé SOLO con el JSON."
  );

  try {
    const match = result.text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : { text: content.hook, sticker: "emoji slider", cta: "Visita el link" };
  } catch {
    return { text: content.hook, sticker: "emoji slider", cta: "Visita el link" };
  }
}

export async function repurposeToThread(content: { hook: string; body: string }): Promise<string[]> {
  const result = await generateTextWithFallback(
    `Convertí este post a un thread (cadenita) de 5-7 tweets/posts conectados:

Hook: ${content.hook}
Cuerpo: ${content.body}

Formato JSON:
{
  "tweets": [
    "1/ Primer tweet (gancho fuerte)",
    "2/ Segundo tweet (contexto)",
    "3/ Tercero (dato clave)",
    "4/ Cuarto (ejemplo)",
    "5/ Quinto (resumen + CTA)"
  ]
}

Reglas:
- Cada tweet máximo 280 caracteres
- Usar números al inicio (1/, 2/, etc)
- El último debe tener CTA y link`,
    "Sos un experto en threads virales para Twitter/X. Español argentino. Respondé SOLO con el JSON."
  );

  try {
    const match = result.text.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : null;
    return parsed?.tweets || [content.hook, content.body];
  } catch {
    return [content.hook, content.body];
  }
}
