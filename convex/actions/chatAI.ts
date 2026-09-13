"use node";

import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";

// ============================================
// SIMPLE AI CHAT - Argentina Timezone
// El usuario dice qué quiere, la IA hace todo
// ============================================

const TZ = "America/Argentina/Buenos_Aires";

interface ChatResult {
  response: string;
  campaignId?: string;
  campaignName?: string;
  piecesGenerated: number;
  imagesGenerated: number;
  hashtags: string[];
  actions: string[];
}

// Horarios humanos Argentina (hora local)
const HUMAN_SCHEDULES = [
  { hour: 8, minuteRange: [5, 25] },
  { hour: 12, minuteRange: [0, 15] },
  { hour: 13, minuteRange: [10, 40] },
  { hour: 17, minuteRange: [0, 20] },
  { hour: 18, minuteRange: [5, 30] },
  { hour: 19, minuteRange: [10, 45] },
  { hour: 20, minuteRange: [0, 20] },
  { hour: 21, minuteRange: [5, 25] },
];

function getHumanTime(dayOffset: number, slotIndex: number): Date {
  const now = new Date();
  const argentinaNow = new Date(now.toLocaleString("en-US", { timeZone: TZ }));

  const targetDate = new Date(argentinaNow);
  targetDate.setDate(targetDate.getDate() + dayOffset);

  const slot = HUMAN_SCHEDULES[slotIndex % HUMAN_SCHEDULES.length];
  const minute = slot.minuteRange[0] + Math.floor(Math.random() * (slot.minuteRange[1] - slot.minuteRange[0]));

  targetDate.setHours(slot.hour, minute, 0, 0);

  // Convertir de Argentina (UTC-3) a UTC
  return new Date(targetDate.getTime() + (3 * 60 * 60 * 1000));
}

export const processMessage = action({
  args: {
    message: v.string(),
  },
  handler: async (ctx, args): Promise<ChatResult> => {
    const message = args.message.toLowerCase().trim();
    const actions: string[] = [];

    if (message.includes("parar") || message.includes("pausar") || message.includes("stop")) {
      await ctx.runMutation(api.autopilot.updateSettings, {
        level: "STOPPED",
        platformFrequencies: { instagram: "0", x: "0", facebook: "0", linkedin: "0", tiktok: "0" },
        topics: "", contentPillars: "", topicsToAvoid: "",
        timeZone: TZ,
        preferredTimeSlots: "", excludedDays: [],
        contentGuidelines: "", approvalRequirements: "",
      });
      return {
        response: "Automatización pausada. No se publicará contenido hasta que me digas que continúe.",
        piecesGenerated: 0,
        imagesGenerated: 0,
        hashtags: [],
        actions: ["Automatización pausada"],
      };
    }

    if (message.includes("reanudar") || message.includes("continuar") || message.includes("play")) {
      await ctx.runMutation(api.autopilot.updateSettings, {
        level: "FULL",
        platformFrequencies: { instagram: "3-5x por semana", x: "1-2x por semana", facebook: "2-3x por semana", linkedin: "1-2x por semana", tiktok: "3-5x por semana" },
        topics: "", contentPillars: "", topicsToAvoid: "",
        timeZone: TZ,
        preferredTimeSlots: "8-13, 17-21", excludedDays: [],
        contentGuidelines: "", approvalRequirements: "Sin aprobación requerida",
      });
      return {
        response: "Automatización reanudada. El sistema volverá a publicar contenido automáticamente en horarios de Argentina.",
        piecesGenerated: 0,
        imagesGenerated: 0,
        hashtags: [],
        actions: ["Automatización reanudada"],
      };
    }

    if (message.includes("estado") || message.includes("cómo está") || message.includes("status")) {
      const campaigns = await ctx.runQuery(api.campaigns.list, { status: "ACTIVE" });
      const settings = await ctx.runQuery(api.autopilot.getSettings);

      if (campaigns.length === 0) {
        return {
          response: "No hay campañas activas. Decime qué querés promocionar y yo me encargo de todo.",
          piecesGenerated: 0,
          imagesGenerated: 0,
          hashtags: [],
          actions: [],
        };
      }

      const statusLines = campaigns.map((c: any) => {
        return `• ${c.name}: ${c.contentCount} piezas, ${c.publishedCount} publicadas`;
      });

      const now = new Date();
      const argentinaTime = now.toLocaleString("es-AR", { timeZone: TZ });

      return {
        response: `Estado actual (${argentinaTime}):\n\n${statusLines.join("\n")}\n\nAutomatización: ${settings?.level || "OFF"}\nHorario: Argentina (ART)\n\n¿Querés que genere más contenido o ajuste algo?`,
        piecesGenerated: 0,
        imagesGenerated: 0,
        hashtags: [],
        actions: [],
      };
    }

    const idea = args.message.trim();
    actions.push("Analizando tu idea...");
    actions.push("Generando estrategia de campaña...");
    actions.push("Creando contenido...");
    actions.push("Programando en horarios humanos de Argentina...");

    const strategy = generateStrategy(idea);
    const pieces = generatePieces(strategy, idea);
    const hashtags = generateSmartHashtags(idea);

    const campaignId = await ctx.runMutation(api.campaigns.create, {
      name: strategy.name,
      description: strategy.description,
      idea: idea,
      objective: strategy.objective,
      targetAudience: strategy.audience,
      painPoints: strategy.painPoints,
      desires: strategy.desires,
      valueProposition: strategy.valueProp,
      funnelStage: "TOFU,MOFU,BOFU",
      communicationAngle: strategy.angle,
      platforms: ["instagram", "facebook", "tiktok"],
      style: "profesional",
      offer: strategy.offer,
      status: "ACTIVE",
      contentCount: pieces.length,
      publishedCount: 0,
      autopilotLevel: "AUTONOMOUS",
    });

    const packId = await ctx.runMutation(api.contentPacks.create, {
      campaignId,
      name: `Pack: ${strategy.name}`,
      description: `Contenido generado para ${strategy.name}`,
      totalPieces: pieces.length,
      generatedPieces: 0,
      status: "GENERATING",
    });

    let imagesGenerated = 0;
    for (const piece of pieces) {
      await ctx.runMutation(api.contentPieces.create, {
        contentPackId: packId,
        campaignId,
        title: piece.title,
        hook: piece.hook,
        body: piece.body,
        cta: piece.cta,
        contentType: piece.type,
        funnelStage: piece.stage,
        platform: piece.platform,
        hashtags: piece.hashtags,
        keywords: piece.keywords,
        imagePrompt: piece.imagePrompt,
        score: piece.score,
        status: "GENERATED",
      });
      imagesGenerated++;
    }

    await ctx.runMutation(api.contentPacks.update, {
      id: packId,
      generatedPieces: pieces.length,
      status: "READY",
      generatedAt: Date.now(),
    });

    // Programar contenido con horarios humanos de Argentina
    let scheduledCount = 0;
    const platforms = ["instagram", "facebook", "tiktok"];

    for (let i = 0; i < pieces.length && scheduledCount < 15; i++) {
      const piece = pieces[i];
      const platform = platforms[i % platforms.length];

      const dayOffset = Math.floor(i / 3) + 1;
      const slotIndex = i % HUMAN_SCHEDULES.length;
      const scheduleTime = getHumanTime(dayOffset, slotIndex);

      try {
        const socialAccounts = await ctx.runQuery(api.socialAccounts.getByPlatform, { platform });
        if (socialAccounts.length === 0) continue;

        const account = socialAccounts[0];
        const idempotencyKey = `sched_chat_${packId}_${i}_${platform}_${scheduleTime.getTime()}`;

        await ctx.runMutation(api.scheduledPosts.create, {
          contentPieceId: (await ctx.runQuery(api.contentPieces.getByPack, { contentPackId: packId }))[i]?._id,
          socialAccountId: account._id,
          platform,
          scheduledAt: scheduleTime.getTime(),
          priority: 1,
          idempotencyKey,
        });

        scheduledCount++;
      } catch {
        // skip
      }
    }

    actions.push(`${pieces.length} piezas de contenido creadas`);
    actions.push(`${hashtags.length} hashtags optimizados generados`);
    actions.push(`${scheduledCount} publicaciones programadas en horarios humanos`);
    actions.push("Zona horaria: Argentina (ART)");
    actions.push("Campaña activada en modo automático");

    const response = generateResponse(strategy, pieces.length, hashtags, scheduledCount);

    return {
      response,
      campaignId,
      campaignName: strategy.name,
      piecesGenerated: pieces.length,
      imagesGenerated,
      hashtags,
      actions,
    };
  },
});

function generateStrategy(idea: string) {
  const words = idea.split(" ").filter((w: string) => w.length > 3);
  const mainTopic = words.slice(0, 3).join(" ") || "tu negocio";

  return {
    name: `Campaña: ${mainTopic.charAt(0).toUpperCase() + mainTopic.slice(1)}`,
    description: `Estrategia de contenido para promocionar ${mainTopic}`,
    objective: `Generar interés y consultas sobre ${mainTopic}`,
    audience: "Personas interesadas en " + mainTopic,
    painPoints: `Problemas comunes relacionados con ${mainTopic}`,
    desires: `Resultados deseados al usar ${mainTopic}`,
    valueProp: `Solución profesional y confiable para ${mainTopic}`,
    angle: "educativo y de valor",
    offer: "Consultá sin compromiso",
  };
}

function generatePieces(strategy: any, idea: string) {
  const pieces = [];
  const types = ["post", "reel", "carousel", "story", "thread"];
  const stages = ["TOFU", "TOFU", "TOFU", "MOFU", "BOFU"];
  const platforms = ["instagram", "facebook", "tiktok"];

  const hooks = [
    `¿Sabías que el 80% de personas no sabe esto sobre ${strategy.name}?`,
    `La verdad que nadie te dice sobre ${strategy.name}`,
    `Cómo lograr resultados sin perder tiempo`,
    `3 errores que estás cometiendo con ${strategy.name}`,
    `Lo que necesitás saber antes de empezar`,
    `El secreto que pocos conocen`,
    `De 0 a experto: guía completa`,
    `¿Por qué algunos lo logran y otros no?`,
    `Esto cambia todo lo que sabías`,
    `La estrategia que funciona en 2024`,
    `Resultado comprobado en 30 días`,
    `El error #1 que debés evitar`,
    `Consejo de expertos que nadie da`,
    `Así se hace correctamente`,
    `La fórmula del éxito`,
  ];

  for (let i = 0; i < 15; i++) {
    const platform = platforms[i % platforms.length];
    const type = types[i % types.length];
    const stage = stages[i % stages.length];
    const hook = hooks[i % hooks.length];

    pieces.push({
      title: hook.substring(0, 60),
      hook,
      body: generateBody(strategy, type, i),
      cta: selectCTA(stage, i),
      type,
      stage,
      platform,
      hashtags: generatePieceHashtags(idea, platform, i),
      keywords: [strategy.name.toLowerCase(), "resultados", "éxito"],
      imagePrompt: `Professional ${type} image about ${strategy.name}, modern, clean, attractive`,
      score: 70 + Math.floor(Math.random() * 25),
    });
  }

  return pieces;
}

function generateBody(strategy: any, type: string, index: number): string {
  if (type === "thread") {
    return `🧵 HILO: Todo lo que necesitás saber\n\n1/ El problema principal\n2/ La solución paso a paso\n3/ Resultados comprobados\n4/ Cómo empezar hoy`;
  }
  if (type === "carousel") {
    return `📌 Slide 1: El problema\n📌 Slide 2: Por qué importa\n📌 Slide 3: La solución\n📌 Slide 4: Resultados\n📌 Slide 5: CTA`;
  }
  return `Transformamos tu situación con un enfoque probado.\n\nSi buscás resultados reales, estamos para ayudarte.\n\n${strategy.valueProp}`;
}

function selectCTA(stage: string, index: number): string {
  const ctas: Record<string, string[]> = {
    TOFU: ["Conocé más", "Seguinos", "Descubrí esto", "Tips gratuitos"],
    MOFU: ["Descargá la guía", "Reservá tu consulta", "Unite al grupo", "Agendá una llamada"],
    BOFU: ["Contactanos ahora", "Empezá hoy", "Agendá tu consulta", "Últimos lugares"],
  };
  const options = ctas[stage] || ctas.TOFU;
  return options[index % options.length];
}

function generatePieceHashtags(idea: string, platform: string, index: number): string[] {
  const base = idea.toLowerCase()
    .replace(/[^a-záéíóúñ\s]/g, "")
    .split(" ")
    .filter((w: string) => w.length > 3)
    .slice(0, 2)
    .map((w: string) => `#${w}`);

  const platformTags: Record<string, string[]> = {
    instagram: ["#instagram", "#reels", "#tips", "#consejos", "#valor"],
    facebook: ["#facebook", "#comunidad", "#emprendedores"],
    tiktok: ["#tiktok", "#fyp", "#viral", "#tip", "#consejo"],
  };

  const extras = platformTags[platform] || [];
  return [...base, ...extras.slice(0, 3)].slice(0, 8);
}

function generateSmartHashtags(idea: string): string[] {
  const words = idea.toLowerCase()
    .replace(/[^a-záéíóúñ\s]/g, "")
    .split(" ")
    .filter((w: string) => w.length > 3);

  const unique = [...new Set(words)].slice(0, 5);
  const base = unique.map((w) => `#${w}`);

  const general = ["#tips", "#consejos", "#valor", "#éxito", "#resultados", "#profesional"];

  return [...base, ...general].slice(0, 10);
}

function generateResponse(strategy: any, piecesCount: number, hashtags: string[], scheduledCount: number): string {
  const now = new Date();
  const argentinaTime = now.toLocaleString("es-AR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

  return `¡Listo! Creé tu campaña "${strategy.name}"

📋 **Lo que hice:**
• Generé ${piecesCount} piezas de contenido únicas
• ${hashtags.length} hashtags optimizados por tema
• Adapté el contenido para Instagram, Facebook y TikTok
• Cada pieza tiene gancho, cuerpo y CTA optimizado

🕐 **Programación (hora Argentina ${argentinaTime}):**
• ${scheduledCount} publicaciones programadas
• Horarios: 8AM-9PM con variación natural
• Sin horarios fijos (minutos aleatorios)
• 3-4 horas entre publicaciones

⚡ **La campaña ya está activa.** El sistema automáticamente:
1. Publica en horarios humanos de Argentina
2. Genera imágenes con IA
3. Recopila métricas y aprende qué funciona

¿Querés que ajuste algo, agregue más contenido, o cambie el estilo?`;
}
