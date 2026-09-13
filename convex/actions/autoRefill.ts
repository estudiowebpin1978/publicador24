"use node";

import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";

// ============================================
// AUTO-REFILL ENGINE
// Keeps each campaign's content queue at minimum
// ============================================

const DEFAULT_MIN_QUEUE = 7;
const DEFAULT_MAX_QUEUE = 30;
const BATCH_SIZE = 5;

export const checkAndRefill = action({
  args: {
    campaignId: v.optional(v.id("campaigns")),
  },
  handler: async (ctx, args) => {
    const campaigns = args.campaignId
      ? [await ctx.runQuery(api.campaigns.getById, { id: args.campaignId })]
      : await ctx.runQuery(api.campaigns.list, { status: "ACTIVE" });

    let totalGenerated = 0;

    for (const campaign of campaigns) {
      if (!campaign || campaign.autopilotLevel === "MANUAL") continue;

      const pieces = await ctx.runQuery(api.contentPieces.getByCampaign, {
        campaignId: campaign._id,
      });

      const queueMinimum = campaign.queueMinimum || DEFAULT_MIN_QUEUE;
      const available = pieces.filter((p) => p.status === "GENERATED").length;
      const needed = queueMinimum - available;

      if (needed <= 0) continue;

      const count = Math.min(needed, BATCH_SIZE);
      const totalPieces = pieces.length;

      if (totalPieces >= DEFAULT_MAX_QUEUE) continue;

      const brandProfile = campaign.brandProfileId
        ? await ctx.runQuery(api.brandProfiles.getById, { id: campaign.brandProfileId })
        : null;

      const strategy = await buildGenerationStrategy(ctx, campaign, brandProfile);

      const pack = await ctx.runMutation(api.contentPacks.create, {
        campaignId: campaign._id,
        name: `Auto-Refill - ${new Date().toLocaleDateString("es-AR")}`,
        description: `Relleno automático de ${count} piezas`,
        totalPieces: count,
        generatedPieces: 0,
        status: "GENERATING",
      });

      const pieces_gen = await generateContentPieces(strategy, count);

      for (const piece of pieces_gen) {
        await ctx.runMutation(api.contentPieces.create, {
          contentPackId: pack._id,
          campaignId: campaign._id,
          title: piece.title,
          hook: piece.hook,
          body: piece.body,
          cta: piece.cta,
          contentType: piece.contentType,
          funnelStage: piece.funnelStage,
          platform: piece.platform,
          hashtags: piece.hashtags,
          keywords: piece.keywords,
          imagePrompt: piece.imagePrompt,
          score: piece.score,
          status: "GENERATED",
          metadata: {
            autoRefill: true,
            generatedAt: Date.now(),
            hookType: piece.hookType,
            style: piece.style,
          },
        });
      }

      await ctx.runMutation(api.contentPacks.update, {
        id: pack._id,
        generatedPieces: count,
        status: "READY",
        generatedAt: Date.now(),
      });

      await ctx.runMutation(api.campaigns.update, {
        id: campaign._id,
        lastGeneratedAt: Date.now(),
      });

      totalGenerated += count;
    }

    return { totalGenerated };
  },
});

interface GenerationStrategy {
  campaignId: string;
  campaignName: string;
  objective: string;
  targetAudience: string;
  painPoints: string;
  desires: string;
  valueProposition: string;
  funnelStage: string;
  communicationAngle: string;
  platforms: string[];
  style: string;
  offer: string;
  brandName: string;
  brandTone: string;
  brandCtas: string[];
  existingHooks: string[];
  existingFormats: string[];
  existingAngles: string[];
}

async function buildGenerationStrategy(
  ctx: any,
  campaign: any,
  brandProfile: any
): Promise<GenerationStrategy> {
  const existingPieces = await ctx.runQuery(api.contentPieces.getByCampaign, {
    campaignId: campaign._id,
  });

  return {
    campaignId: campaign._id,
    campaignName: campaign.name,
    objective: campaign.objective || "brand_awareness",
    targetAudience: campaign.targetAudience || "general",
    painPoints: campaign.painPoints || "",
    desires: campaign.desires || "",
    valueProposition: campaign.valueProposition || "",
    funnelStage: campaign.funnelStage || "TOFU",
    communicationAngle: campaign.communicationAngle || "educational",
    platforms: campaign.platforms,
    style: campaign.style || "professional",
    offer: campaign.offer || "",
    brandName: brandProfile?.name || "Marca",
    brandTone: brandProfile?.tone || "profesional y cercano",
    brandCtas: brandProfile?.defaultCtas || ["Visitanos", "Contactanos"],
    existingHooks: existingPieces.map((p: any) => p.hook),
    existingFormats: existingPieces.map((p: any) => p.contentType),
    existingAngles: existingPieces.map((p: any) => p.metadata?.angle || ""),
  };
}

interface GeneratedPiece {
  title: string;
  hook: string;
  body: string;
  cta: string;
  contentType: string;
  funnelStage: string;
  platform: string;
  hashtags: string[];
  keywords: string[];
  imagePrompt: string;
  score: number;
  hookType: string;
  style: string;
}

async function generateContentPieces(
  strategy: GenerationStrategy,
  count: number
): Promise<GeneratedPiece[]> {
  const pieces: GeneratedPiece[] = [];

  const hookTypes = [
    "question",
    "statistic",
    "story",
    "provocative",
    "how-to",
    "myth-busting",
    "before-after",
    "curiosity",
    "urgency",
    "social-proof",
  ];

  const contentTypes = ["post", "reel", "carousel", "story", "thread"];
  const funnelStages = ["TOFU", "MOFU", "BOFU"];

  for (let i = 0; i < count; i++) {
    const hookType = hookTypes[i % hookTypes.length];
    const contentType = contentTypes[i % contentTypes.length];
    const stage = funnelStages[i % funnelStages.length];
    const platform = strategy.platforms[i % strategy.platforms.length];

    const piece = generateSinglePiece(strategy, hookType, contentType, stage, platform, i);
    pieces.push(piece);
  }

  return pieces;
}

function generateSinglePiece(
  strategy: GenerationStrategy,
  hookType: string,
  contentType: string,
  funnelStage: string,
  platform: string,
  index: number
): GeneratedPiece {
  const hooks = generateHook(strategy, hookType, index);
  const body = generateBody(strategy, contentType, index);
  const cta = selectCta(strategy, funnelStage, index);
  const hashtags = generateHashtags(strategy, platform, index);

  return {
    title: hooks.title,
    hook: hooks.hook,
    body,
    cta,
    contentType,
    funnelStage,
    platform,
    hashtags,
    keywords: extractKeywords(body),
    imagePrompt: generateImagePrompt(strategy, contentType, index),
    score: 70 + Math.random() * 20,
    hookType,
    style: strategy.style,
  };
}

function generateHook(strategy: GenerationStrategy, hookType: string, index: number) {
  const { campaignName, targetAudience, painPoints } = strategy;

  const hooksByType: Record<string, string[]> = {
    question: [
      `¿Sabías que el ${70 + index}% de ${targetAudience} comete este error?`,
      `¿Qué pasaría si pudieras resolver ${painPoints?.split(",")[0] || "tu problema"} en 7 días?`,
      `¿Te ha pasado que ${targetAudience} no sabe qué hacer?`,
    ],
    statistic: [
      `El 85% de casos similares se resuelven con el enfoque correcto`,
      `Solo el 15% de personas conocen esta estrategia`,
      `Los números hablan: más de 500 casos resueltos`,
    ],
    story: [
      `Un cliente llegó desesperado... 30 días después todo cambió`,
      `María tenía el mismo problema que vos... hasta que descubrió esto`,
      `La historia de cómo pasamos del caos al control total`,
    ],
    provocative: [
      `Si no estás haciendo esto, estás perdiendo tiempo y dinero`,
      `La verdad que nadie te dice sobre ${strategy.campaignName}`,
      `Dejá de creer los mitos sobre esto`,
    ],
    "how-to": [
      `Cómo lograr resultados sin perder horas intentando`,
      `Paso a paso: la guía completa que necesitás`,
      `3 pasos simples para empezar a ver cambios hoy`,
    ],
    "myth-busting": [
      `Mito: necesitás gastar mucho para ver resultados. Realidad:`,
      `No, no necesitás ser experto para lograr esto`,
      `Lo que te dicen sobre esto está mal`,
    ],
    "before-after": [
      `Antes: desorientado. Después: con un plan claro`,
      `De 0 a 100: el antes y después de aplicar esto`,
      `Así se ve el cambio cuando aplicás la estrategia correcta`,
    ],
    curiosity: [
      `El secreto que pocos conocen sobre ${strategy.campaignName}`,
      `Esto cambia todo lo que sabías al respecto`,
      `La herramienta que nadie te recomendó`,
    ],
    urgency: [
      `Si no actuás ahora, vas a seguir perdiendo oportunidades`,
      `El momento es ahora: cada día que pasa es una oportunidad perdida`,
      `No esperes más: esto es lo que tenés que hacer hoy`,
    ],
    "social-proof": [
      `+500 personas ya aplicaron esto con éxito`,
      `Nuestros clientes ya están viendo resultados`,
      `La comunidad ya está usando esta estrategia`,
    ],
  };

  const options = hooksByType[hookType] || hooksByType.question;
  const hook = options[index % options.length];

  return {
    title: hook.substring(0, 60),
    hook,
  };
}

function generateBody(strategy: GenerationStrategy, contentType: string, index: number) {
  const parts: string[] = [];

  if (contentType === "thread") {
    parts.push(`🧵 HILO: Lo que necesitás saber sobre ${strategy.campaignName}\n`);
    parts.push(`1/ El problema principal: ${strategy.painPoints || "la falta de claridad"}\n`);
    parts.push(`2/ La solución: ${strategy.valueProposition || "un enfoque estratégico"}\n`);
    parts.push(`3/ El resultado: ${strategy.desires || "transformar tu situación"}\n`);
  } else if (contentType === "carousel") {
    parts.push(`📌 Slide 1: ${strategy.painPoints || "El problema que enfrentás"}\n`);
    parts.push(`📌 Slide 2: Por qué importa\n`);
    parts.push(`📌 Slide 3: La solución paso a paso\n`);
    parts.push(`📌 Slide 4: Resultados comprobados\n`);
    parts.push(`📌 Slide 5: ${strategy.brandCtas[0] || "Dale, empezá hoy"}`);
  } else {
    parts.push(strategy.valueProposition || "Transformamos tu situación con un enfoque probado.");
    parts.push("");
    parts.push(strategy.painPoints
      ? `Si enfrentás: ${strategy.painPoints}`
      : "Si buscás resultados reales");
    parts.push(strategy.desires
      ? `Nosotros te ayudamos a lograr: ${strategy.desires}`
      : "Estamos para ayudarte a alcanzar tus objetivos.");
  }

  return parts.join("\n");
}

function selectCta(strategy: GenerationStrategy, funnelStage: string, index: number) {
  const ctasByStage: Record<string, string[]> = {
    TOFU: ["Conocé más", "Seguinos para tips", "Descubrí esto"],
    MOFU: ["Descargá la guía", "Reservá tu consulta", "Unite al grupo"],
    BOFU: ["Contactanos ahora", "Agendá tu llamada", "Empezá hoy"],
  };

  const options = ctasByStage[funnelStage] || strategy.brandCtas;
  return options[index % options.length];
}

function generateHashtags(strategy: GenerationStrategy, platform: string, index: number) {
  const base = strategy.campaignName
    .toLowerCase()
    .replace(/[^a-záéíóúñ\s]/g, "")
    .split(" ")
    .filter((w: string) => w.length > 3)
    .slice(0, 3)
    .map((w: string) => `#${w}`);

  const platformTags: Record<string, string[]> = {
    instagram: ["#instagram", "#reels", "#carousel"],
    tiktok: ["#tiktok", "#fyp", "#viral"],
    facebook: ["#facebook", "#comunidad"],
    linkedin: ["#linkedin", "#networking"],
    x: ["#twitter", "#thread"],
  };

  const extras = platformTags[platform] || [];
  return [...base, ...extras.slice(0, 2)].slice(0, 8);
}

function extractKeywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-záéíóúñ\s]/g, "")
    .split(/\s+/)
    .filter((w: string) => w.length > 4);

  const freq: Record<string, number> = {};
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w]) => w);
}

function generateImagePrompt(strategy: GenerationStrategy, contentType: string, index: number) {
  const styles: Record<string, string> = {
    professional: "clean, modern, corporate",
    casual: "warm, friendly, approachable",
    elegant: "sophisticated, minimal, luxury",
    bold: "vibrant, energetic, eye-catching",
  };

  const style = styles[strategy.style] || styles.professional;

  return `Professional ${contentType} image for ${strategy.campaignName}, ${style} style, ${strategy.targetAudience} audience, high quality, 4k`;
}
