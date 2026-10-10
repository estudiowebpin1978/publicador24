/**
 * Motor único de copywriting para todas las publicaciones del producto.
 *
 * Objetivo (pedido del usuario):
 *  - Descripciones naturales: que suenen a persona real, no a transcripción ni a IA.
 *  - Rol experto: copywriter publicitario + SEO + marketing.
 *  - Siempre orientado a llevar visitas al sitio web de la campaña.
 *  - Universal: el copy sale del contexto de la campaña (nicho, público, oferta, URL),
 *    nunca de un nicho hardcodeado.
 */

export interface CopyCampaignContext {
  name?: string;
  description?: string;
  idea?: string;
  objective?: string;
  target_audience?: string;
  value_proposition?: string;
  offer?: string;
  style?: string;
  url?: string;
}

/** URL por defecto cuando la campaña no define la suya propia. */
export const DEFAULT_SITE_URL = 'https://quiniela-ia-two.vercel.app';

/** Devuelve la URL del sitio para la CTA (acepta con o sin https://). */
export function getSiteUrl(campaign?: CopyCampaignContext | null): string {
  const raw = (campaign?.url || '').trim();
  if (!raw) return DEFAULT_SITE_URL;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw.replace(/^\/+/, '')}`;
}

/** Rol compartido por todos los generadores de contenido. */
export const COPYWRITER_SYSTEM = `Sos copywriter publicitario senior, especialista en SEO y creador de contenido para redes sociales, con más de 10 años trabajando marcas reales.

Cómo escribís:
- Español rioplatense: voseo natural, lenguaje de todos los días.
- Ritmo humano: frases cortas y largas alternadas, párrafos de 1 a 3 líneas.
- Concreto antes que genérico: situaciones reales del nicho, ejemplos concretos y datos que la campaña haya dado (nunca números inventados).
- Un solo mensaje por publicación: desarrollalo bien en vez de enumerar de punta a punta.
- Nada de estructura de informe ni de transcripción: prohibido arrancar "En este post vamos a ver", enumerar "Primero... Segundo... Tercero...", ni resumir como si leyeras un guion.
- Español correcto pero coloquial: escribile al lector, no a un comité.

Nunca suenas a IA. Palabras y fórmulas prohibidas: "descubrí el poder de", "en el mundo de", "sumérgete en", "hoy vamos a hablar de", "como nunca antes", "no te pierdas", "¡increíble!", "elevá tu negocio al siguiente nivel", "la solución definitiva", "revolucioná", "potenciamos tu experiencia", "magia", "puro arte", "un viaje de los sentidos", "para todos los paladares", y cualquier lista genérica de beneficios sin sustancia. Máximo un signo de exclamación por publicación.
- Tampoco arranques con "¿Sabías que...?": esa fórmula ya la usó todo el mundo. Arrancá con una situación concreta, una pregunta que le duela al lector o un detalle poco obvio del tema.

SEO de verdad: usá las palabras que la gente realmente busca en Google para ese nicho, meté la keyword principal en el gancho o la primera línea, y redactá pensando en que la descripción tenga chances de aparecer en búsquedas (título claro, sin relleno, contexto del servicio).

Datos e integridad (obligatorio):
- No inventes estadísticas, porcentajes, cifras, precios ni premios. Si la campaña no te dio un dato real, no lo uses: hablá del servicio sin numerar.
- No inventes testimonios ni anécdotas de personas (nada de "mi amigo X ganó...", "un cliente nos contó...").
- No inventes escasez ni urgencia ("edición limitada", "últimas unidades", "sólo hoy") salvo que la campaña lo declare explícitamente.
- No atribuyas características ni beneficios que la campaña no declaró: nada de "productos ecológicos", "equipo de expertos", "sin sorpresas", "garantizado", "el más barato" ni "para siempre", salvo que estén escritos en el contexto de la campaña. Si algo no está en el contexto, no lo afirmes.
- No prometas un estado permanente ("siempre", "nunca más", "toda la vida"): describí lo que el servicio hace, no lo que asegura.
- Si el nicho es de azar, apuestas o dinero: sin promesas de ganancia, sin "probabilidad de acertar" y sin porcentajes de éxito.

Cada publicación tiene un objetivo de negocio: que la persona entre al sitio web. Cerrá siempre con una invitación concreta al sitio, dando un motivo real para entrar (no "visitanos ahora" vacío, y sin repetir la misma frase todos los días).

Respondé SOLO con el JSON pedido, sin texto antes ni después.`;

/** Reglas de estilo aplicadas al cuerpo de cada publicación. */
export const NATURAL_RULES = `- Primera línea que frena el scroll: una pregunta concreta, un dato o una situación real del público (nunca un "¿Sabías que...?" vacío).
- Desarrollo de 40 a 110 palabras con una idea que aporte de verdad; sin lista de promesas.
- Ritmo humano: alterná frases de 6 palabras con otras de 15. Sin relleno: si una frase no aporta, sacala.
- Escribí como le hablarías a un amigo, no como un folleto ni como una nota de radio.
- No repitas el mismo arranque ni la misma estructura entre publicaciones.`;

/** Guías de formato por plataforma (sin nichos hardcodeados). */
export const PLATFORM_STYLES: Record<string, string> = {
  tiktok: `Generá un post para TikTok.
ESTILO: Entretenimiento, una sola idea, humor o curiosidad, texto que se lee en 5 segundos.
INCLUYE: Gancho en la primera línea, tono joven e informal, llamado a la acción simple.
HOOK: máximo 150 caracteres. Cuerpo corto: 40 a 80 palabras.`,
  instagram: `Generá un post para Instagram (Reel o carrusel).
ESTILO: Prueba social, educación breve, situaciones reales.
INCLUYE: Gancho en la primera línea (se corta con "ver más"), emojis con moderación (0 a 3), hashtags al final.
HOOK: máximo 10 palabras. Cuerpo: 60 a 110 palabras.`,
  facebook: `Generá un post para Facebook.
ESTILO: Comunidad, información útil, datos concretos, tono adulto +35.
INCLUYE: Contexto + opinión, enlace claro al sitio en el cierre, invitación a comentar.
HOOK: máximo 10 palabras. Cuerpo: 70 a 120 palabras.`,
  youtube: `Generá contenido para YouTube.
ESTILO: Video educativo o de entretenimiento, optimizado para buscadores.
INCLUYE: Título llamativo con keyword principal (max 100 caracteres), descripción con el enlace, tags SEO.
HOOK: máximo 10 palabras. Cuerpo: 80 a 130 palabras.`,
  linkedin: `Generá un post para LinkedIn.
ESTILO: Profesional pero humano, aprendizaje o dato que sirva, sin humo corporativo.
INCLUYE: Pregunta que invite a comentar y enlace al sitio.
HOOK: máximo 10 palabras. Cuerpo: 90 a 140 palabras.`,
  threads: `Generá un post para Threads.
ESTILO: Conversacional, corto, como charlar con un conocido.
INCLUYE: Una idea clara y un motivo para entrar al sitio.
HOOK: máximo 10 palabras. Cuerpo: 40 a 90 palabras.`,
  x: `Generá un post para X (Twitter).
ESTILO: Directo, una idea, sin relleno.
INCLUYE: Máximo 280 caracteres en total, 1 o 2 hashtags como máximo.
HOOK: máximo 10 palabras. Cuerpo: 40 a 70 palabras.`,
};

/** Bloque de contexto de campaña compartido por todos los prompts. */
export function buildCampaignContext(campaign?: CopyCampaignContext | null): string {
  const lines: string[] = ['CONTEXTO DE LA CAMPAÑA'];
  if (campaign?.name) lines.push(`- Nombre: ${campaign.name}`);

  const about = [campaign?.idea, campaign?.description]
    .map((v) => (v || '').trim())
    .filter(Boolean)
    .join(' — ');
  if (about) lines.push(`- De qué se trata: ${about}`);
  if (campaign?.objective) lines.push(`- Objetivo: ${campaign.objective}`);
  if (campaign?.target_audience) lines.push(`- Público objetivo: ${campaign.target_audience}`);
  if (campaign?.value_proposition) lines.push(`- Propuesta de valor: ${campaign.value_proposition}`);
  if (campaign?.offer) lines.push(`- Oferta puntual: ${campaign.offer}`);
  if (campaign?.style) lines.push(`- Tono de la marca: ${campaign.style}`);
  lines.push(`- Sitio web (CTA obligatoria en todo contenido): ${getSiteUrl(campaign)}`);
  return lines.join('\n');
}

/**
 * Prompt completo para una publicación de red social.
 * Mismo esquema JSON que ya consume el autopilot: hook / body / cta / hashtags.
 */
export function buildPostPrompt(
  platform: string,
  campaign?: CopyCampaignContext | null,
  extra?: string
): string {
  const style = PLATFORM_STYLES[platform] || PLATFORM_STYLES.instagram;
  const site = getSiteUrl(campaign);
  const parts = [
    style,
    '',
    buildCampaignContext(campaign),
    '',
    'REGLAS DE ESCRITURA (obligatorias):',
    NATURAL_RULES,
    '',
    'TAREA',
    `Escribí la publicación de hoy para ${platform}: que le hable al público de la campaña y le dé un motivo real para entrar a ${site}.`,
    '',
    'Respondé SOLO JSON válido:',
    '{',
    '  "hook": "primera línea que frena el scroll, máximo 10 palabras, sin comillas ni saltos de línea dentro",',
    '  "body": "desarrollo natural en español rioplatense, máximo 90 palabras, sin sonar a IA ni a transcripción, sin datos ni características que no estén en el contexto",',
    `  "cta": "invitación corta y concreta a entrar a ${site}, con un motivo real para el lector (variá la redacción)",`,
    '  "hashtags": ["3 a 5 hashtags en español, específicos del nicho"]',
    '}',
  ];
  if (extra) parts.push('', extra);
  return parts.join('\n');
}

/**
 * Garantiza que la URL del sitio esté presente en el texto publicado.
 * Si la IA la omitió, la agrega al CTA (no la duplica si ya existe).
 */
export function ensureSiteUrl(text: string, campaign?: CopyCampaignContext | null): string {
  const site = getSiteUrl(campaign);
  const clean = (text || '').trim();
  if (!clean) return site;
  // Comparar por hostname (con y sin www): detecta la URL aunque el texto la
  // escriba sin protocolo o con un path distinto, sin aceptar a cambio otra
  // URL del mismo dominio raíz (p. ej. otra app en *.vercel.app).
  let host = site;
  try {
    host = new URL(site).hostname.replace(/^www\./, '');
  } catch {
    host = site.replace(/^https?:\/\//i, '').split('/')[0].replace(/^www\./, '');
  }
  const lower = clean.toLowerCase();
  const hasUrl =
    lower.includes(site.toLowerCase()) ||
    lower.includes(host.toLowerCase()) ||
    lower.includes(`www.${host}`.toLowerCase());
  return hasUrl ? clean : `${clean}\n\nMirá más en ${site}`;
}

/**
 * Prompt de imagen derivado de la campaña (para que la imagen tenga que ver
 * con lo pedido, y no con un nicho hardcodeado). Devuelve null si la campaña
 * no tiene texto suficiente.
 */
export function buildImagePrompt(
  platform: string,
  campaign?: CopyCampaignContext | null
): string | null {
  const about = [campaign?.idea, campaign?.description, campaign?.name]
    .map((v) => (v || '').trim())
    .filter(Boolean)
    .join('. ');
  if (!about) return null;

  const ratio = platform === 'youtube' ? '16:9' : '1:1';
  return `Foto real, estilo UGC (como la que saca una persona con el celular), para ${platform}, relacionada con: ${about}. Luz natural, encuadre espontáneo, sin cara de modelo publicitario, sin texto ni letras en la imagen, sin logos falsos, colores coherentes con la campaña. Proporción ${ratio}.`;
}

/** La campaña es de quiniela/lotería: ahí sí corresponden las imágenes curadas. */
/**
 * El público es de Argentina y Latinoamérica (+18). Los modelos de imagen
 * tienden a devolver caras asiáticas si no se lo pide uno explícitamente, y
 * así salían fotos con gente que no se parece a la audiencia de la campaña.
 * Se concatena a TODOS los prompts de imagen.
 */
export const AUDIENCE_CONTEXT =
  'Público objetivo: argentinos y latinoamericanos. ' +
  'Personas de rasgos latinoamericanos (tez morena u oliva, cabello oscuro), ' +
  'corte de pelo y ropa típica de Argentina, nada de rasgos asiáticos. ' +
  'Escena local argentina: kiosco o lotería de barrio, cartelera de quiniela, ' +
  'pesos argentinos, avenidas y casas de Argentina. Luz natural de día.';

export function isLotteryCampaign(campaign?: CopyCampaignContext | null): boolean {
  const about = [campaign?.name, campaign?.idea, campaign?.description].join(' ');
  return /quiniela|loter[ií]a|sorteo|bolet[oa]|números ganadores/i.test(about);
}

/** Prompt específico para la generación de contenido de YouTube (título/descripción/tags). */
export function buildYouTubePrompt(campaign?: CopyCampaignContext | null): string {
  const site = getSiteUrl(campaign);
  return `${buildCampaignContext(campaign)}

TAREA
Generá contenido optimizado para YouTube (SEO de video) sobre la campaña, apuntando a que el espectador entre a ${site}.

Reglas de escritura (obligatorias):
${NATURAL_RULES}

Respondé SOLO JSON válido:
{
  "title": "Título llamativo para YouTube (max 100 caracteres, keyword principal al inicio, termina con #Shorts)",
  "description": "Descripción natural en español rioplatense (min 200 caracteres): primeras 2 líneas con la keyword y el motivo para ver, luego desarrollo, y el enlace ${site} incluido de forma natural",
  "tags": ["8 tags en español relacionados con el nicho y lo que la gente busca"],
  "thumbnail_prompt": "Descripción de la imagen thumbnail (natural, realista, relacionada a la campaña, sin texto inventado)"
}`;
}
