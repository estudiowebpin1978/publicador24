import { NextRequest, NextResponse } from "next/server";
import { generateTextWithFallback } from "@/lib/ai/multi-provider";
import { generateImageWithFallback } from "@/lib/ai/multi-image";
import { getTodayCost } from "@/lib/ai/cost-tracker";
import { checkPublicationSafety } from "@/lib/ai/publication-safety";

interface LoopResult {
  timestamp: number;
  contentGenerated: number;
  contentPublished: number;
  safetyChecks: number;
  errors: string[];
  details: string[];
}

async function callBuffer(query: string, variables?: Record<string, unknown>) {
  const apiKey = process.env.BUFFER_API_KEY;
  if (!apiKey || apiKey === "tu-key-aqui" || apiKey === "your-buffer-api-key") {
    throw new Error("BUFFER NOT CONFIGURED");
  }

  const res = await fetch("https://api.buffer.com", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error("BUFFER_RATE_LIMIT");
    throw new Error(`Buffer HTTP ${res.status}`);
  }

  const data = await res.json();
  if (data.errors) {
    const code = data.errors[0]?.extensions?.code;
    if (code === "RATE_LIMIT_EXCEEDED") throw new Error("BUFFER_RATE_LIMIT");
    throw new Error(`Buffer: ${data.errors[0]?.message || "unknown"}`);
  }
  return data.data;
}

async function getBufferChannels() {
  const accountData = await callBuffer(`{ account { id organizations { id } } }`);
  const orgId = accountData.account.organizations[0]?.id;
  if (!orgId) throw new Error("No Buffer organization found");

  const channelsData = await callBuffer(
    `{ channels(input: { organizationId: "${orgId}" }) { id service displayName name isDisconnected isLocked } }`
  );
  return channelsData.channels.filter((ch: { isDisconnected: boolean; isLocked: boolean }) => !ch.isDisconnected && !ch.isLocked);
}

async function publishToBuffer(text: string, channelId: string, imageUrl?: string, platform?: string) {
  const input: Record<string, unknown> = {
    channelId,
    text,
    mode: "addToQueue",
    schedulingType: "automatic",
    needsApproval: false,
  };

  if (imageUrl) {
    input.assets = { image: { url: imageUrl } };
  }

  if (platform === "instagram") {
    input.metadata = { instagram: { type: "post", shouldShareToFeed: true } };
  } else if (platform === "facebook") {
    input.metadata = { facebook: { type: "post" } };
  } else if (platform === "tiktok") {
    input.metadata = { tiktok: {} };
  }

  const result = await callBuffer(
    `mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess { post { id text status } }
        ... on MutationError { message }
      }
    }`,
    { input }
  );
  return result.createPost;
}

const HOOKS = [
  "Sabias que el 80% de los que juegan quiniela pierden por falta de estrategia?",
  "Te voy a revelar el metodo que uso para analizar la quiniela con IA",
  "No es suerte. Es matematica. Asi analizo los numeros con inteligencia artificial",
  "Si todavia no usas IA para la quiniela, estas dejando plata sobre la mesa",
  "La quiniela no se predice. Se analiza. Y la IA es tu mejor herramienta",
  "3 errores que cometen todos los que juegan quiniela (y como la IA los corrige)",
  "Transforma tu forma de jugar quiniela con este metodo basado en datos",
];

const CAPTIONS = [
  "La quiniela no es solo suerte. Es analisis.\n\nCon inteligencia artificial, puedo estudiar patrones, tendencias y estadisticas que el ojo humano no ve.\n\nAsi es como me acerco a los aciertos, paso a paso.\n\nQueres ver como funciona? Link en bio.",
  "Cada numero tiene una historia. La IA la lee.\n\nNo adivino. Analizo. Los datos son los que mandan.\n\nSi queres dejar de jugar a ciegas, esta es tu oportunidad.\n\nDescubi mi metodo → link en bio.",
  "El 90% de los jugadores pierden. Yo estoy en el otro 10%.\n\nLa diferencia? Uso inteligencia artificial para analizar cada jugada.\n\nNo es magia. Es estrategia.\n\nUnite a los que juegan distinto.",
  "Pensa la quiniela como un inversor piensa la bolsa.\n\nDatos. Tendencias. Analisis. Y un toque de IA.\n\nAsi genero mis predicciones todas las semanas.\n\nQueres probar? Link en bio.",
  "Hoy te muestro como la IA cambio mi forma de jugar quiniela.\n\nAntes: intuicion.\nAhora: datos + IA = mejores resultados.\n\nEl futuro de la quiniela es inteligente.",
  "No necesitas ser matematico para ganar en quiniela.\n\nNecesitas la herramienta correcta. Y la IA es esa herramienta.\n\nAnalizo patrones, detecto tendencias y te doy los numeros mas probables.",
  "Cada semana mejoro mi metodo. Gracias a la IA.\n\nLos datos no mienten. Y la inteligencia artificial los interpreta mejor que nadie.\n\nQueres ver los resultados? Segui mi perfil.",
];

export async function POST(_request: NextRequest) {
  const result: LoopResult = {
    timestamp: Date.now(),
    contentGenerated: 0,
    contentPublished: 0,
    safetyChecks: 0,
    errors: [],
    details: [],
  };

  try {
    let channels: { id: string; service: string; displayName: string }[] = [];
    try {
      channels = await getBufferChannels();
      result.details.push(`Buffer: ${channels.length} channels connected`);
    } catch (e) {
      result.errors.push(`Buffer: ${e instanceof Error ? e.message : "connection failed"}`);
      return NextResponse.json(result);
    }

    if (channels.length === 0) {
      result.errors.push("No active Buffer channels found");
      return NextResponse.json(result);
    }

    const instaChannels = channels.filter((c) => c.service === "instagram");
    const tiktokChannels = channels.filter((c) => c.service === "tiktok");
    const targetChannels = [...instaChannels, ...tiktokChannels];

    if (targetChannels.length === 0) {
      result.errors.push("No Instagram or TikTok channels found in Buffer");
      return NextResponse.json(result);
    }

    for (let i = 0; i < Math.min(targetChannels.length, 3); i++) {
      const channel = targetChannels[i];
      const hookIdx = i % HOOKS.length;
      const captionIdx = i % CAPTIONS.length;

      let hook = HOOKS[hookIdx];
      let caption = CAPTIONS[captionIdx];

      try {
        const aiResult = await generateTextWithFallback(
          `Generá un caption corto para ${channel.service} sobre quiniela e IA. Hook: "${hook}". Respondé JSON: { "hook": "...", "caption": "..." }`,
          "Sos un copywriter experto. Español rioplatense. JSON válido."
        );
        const match = aiResult.text.match(/```json\s*([\s\S]*?)```/);
        const parsed = JSON.parse(match ? match[1] : aiResult.text);
        hook = parsed.hook || hook;
        caption = parsed.caption || caption;
      } catch {
        // Use template content - AI not available
      }

      const safety = await checkPublicationSafety(`auto-${i}`, hook, caption, channel.service);
      result.safetyChecks++;

      if (!safety.approved) {
        result.details.push(`Blocked: ${hook.substring(0, 40)}... — ${safety.reason}`);
        continue;
      }

      const hashtags = ["#quiniela", "#quinielaia", "#prediccionquiniela", "#inteligenciaartificial", "#quinielaargentina", "#analisisquiniela", "#ia", "#numeros", "#estrategiaquiniela", "#quinielagratis"];
      const text = `${hook}\n\n${caption}\n\n${hashtags.join(" ")}`;

      let imageUrl: string | undefined;
      try {
        const imageResult = await generateImageWithFallback(`${hook}, quiniela, inteligencia artificial, social media`, "1:1");
        imageUrl = imageResult.url;
      } catch {
        // Image generation is best-effort
      }

      try {
        const postResult = await publishToBuffer(text, channel.id, imageUrl, channel.service);
        if (postResult?.post?.id) {
          result.contentPublished++;
          result.details.push(`Published: ${hook.substring(0, 40)}... → ${channel.displayName}`);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "failed";
        if (msg.includes("RATE_LIMIT")) {
          result.errors.push("Buffer rate limited — stopping");
          break;
        }
        result.errors.push(`Publish: ${msg}`);
      }
    }

    result.details.push(`Cost today: $${getTodayCost().totalCost.toFixed(4)} | ${getTodayCost().totalTokens} tokens`);

    return NextResponse.json(result);
  } catch (error) {
    result.errors.push(`Fatal: ${error instanceof Error ? error.message : "unknown"}`);
    return NextResponse.json(result, { status: 500 });
  }
}



