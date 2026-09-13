"use node";

import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";
import type { ActionCtx } from "../_generated/server";

interface CampaignStrategy {
  campaignName: string;
  objective: string;
  targetAudience: string;
  painPoints: string[];
  desires: string[];
  valueProposition: string;
  communicationAngle: string;
  funnelStages: string[];
  contentMix: {
    educational: number;
    capture: number;
    objection: number;
    authority: number;
    conversion: number;
  };
}

interface ContentPieceInput {
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
}

interface ContentPackResult {
  campaignStrategy: CampaignStrategy;
  pieces: ContentPieceInput[];
  totalGenerated: number;
}

async function callAIForCampaignStrategy(
  idea: string,
  product: string,
  objective: string,
  audience: string,
  platforms: string[],
  style: string,
  offer: string
): Promise<CampaignStrategy> {
  const hasApiKey = !!process.env.AI_API_KEY;

  if (!hasApiKey) {
    return generateMockStrategy(idea, product, objective, audience, platforms, style, offer);
  }

  const systemPrompt = `Sos un estratega de marketing digital experto para redes sociales en Argentina.
Responde SIEMPRE con JSON válido, sin texto adicional.
Usá voseo argentino. Todo en español.`;

  const userPrompt = `Analizá esta idea de contenido y creá una estrategia completa de campaña:

IDEA: "${idea}"
PRODUCTO/SERVICIO: "${product}"
OBJETIVO: "${objective}"
PÚBLICO OBJETIVO: "${audience}"
PLATAFORMAS: ${platforms.join(", ")}
ESTILO: "${style}"
OFERTA: "${offer || "N/A"}"

Respondé con JSON:
{
  "campaignName": "Nombre atractivo de la campaña (4-6 palabras)",
  "objective": "Objetivo específico y medible",
  "targetAudience": "Descripción detallada del público ideal",
  "painPoints": ["dolor1", "dolor2", "dolor3", "dolor4"],
  "desires": ["deseo1", "deseo2", "deseo3", "deseo4"],
  "valueProposition": "Propuesta de valor clara en 1-2 oraciones",
  "communicationAngle": "Ángulo principal de comunicación (problema/solución, beneficio, urgencia, etc)",
  "funnelStages": ["descubrimiento", "consideracion", "conversion", "retencion"],
  "contentMix": {
    "educational": 10,
    "capture": 8,
    "objection": 5,
    "authority": 4,
    "conversion": 3
  }
}`;

  const response = await fetch(
    `${process.env.AI_API_BASE_URL || "https://api.openai.com/v1"}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "gemini-2.0-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  const match = text.match(/```json\s*([\s\S]*?)```/);
  const jsonStr = match ? match[1] : text;
  return JSON.parse(jsonStr.trim()) as CampaignStrategy;
}

async function callAIForContentPack(
  strategy: CampaignStrategy,
  idea: string,
  product: string,
  platforms: string[],
  count: number
): Promise<ContentPieceInput[]> {
  const hasApiKey = !!process.env.AI_API_KEY;

  if (!hasApiKey) {
    return generateMockContentPack(strategy, idea, product, platforms, count);
  }

  const systemPrompt = `Sos un experto en copywriting y contenido para redes sociales en Argentina.
Generás contenido en español con voseo argentino.
Responde SIEMPRE con JSON válido, sin texto adicional.
Cada pieza debe ser única, con hook diferente, ángulo diferente y CTA diferente.`;

  const userPrompt = `Generá ${count} piezas de contenido conectadas para esta campaña:

CAMPAÑA: "${strategy.campaignName}"
IDEA: "${idea}"
PRODUCTO: "${product}"
OBJETIVO: "${strategy.objective}"
PÚBLICO: "${strategy.targetAudience}"
DOLORES: ${strategy.painPoints.join(", ")}
DESEOS: ${strategy.desires.join(", ")}
PROPUESTA DE VALOR: "${strategy.valueProposition}"
ÁNGULO: "${strategy.communicationAngle}"
ESTILO: "${strategy.communicationAngle}"

DISTRIBUCIÓN:
- ${strategy.contentMix.educational} educativas (descubrimiento)
- ${strategy.contentMix.capture} de captación (consideración)
- ${strategy.contentMix.objection} de objeciones (consideración)
- ${strategy.contentMix.authority} de autoridad (consideración)
- ${strategy.contentMix.conversion} de conversión

PLATAFORMAS: ${platforms.join(", ")}

Para cada pieza generá:
{
  "pieces": [
    {
      "title": "Título llamativo",
      "hook": "Gancho inicial (primera línea que engancha)",
      "body": "Cuerpo del contenido (3-10 oraciones, relevante, con valor)",
      "cta": "Call to action claro y directo",
      "contentType": "educational|capture|objection|authority|conversion",
      "funnelStage": "descubrimiento|consideracion|conversion|retencion",
      "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"],
      "keywords": ["keyword1", "keyword2", "keyword3"],
      "imagePrompt": "Prompt detallado para generar imagen publicitaria (en inglés, descriptivo, incluyendo estilo, colores, composición)",
      "score": 85
    }
  ]
}

REGLAS:
1. Cada hook debe ser diferente (curiosidad, pregunta, problema, beneficio, historia, dato, contrarian)
2. Los hashtags deben incluir 2-3 populares + 2-3 de nicho
3. Los CTAs deben variar (consultá, descubrí, escribinos, visitá, probá)
4. El imagePrompt debe ser descriptivo y en inglés para generadores de imagen
5. El contenido debe ser natural, no forzado
6. Usá voseo argentino
7. Adaptá la longitud según la plataforma (X: corto, Instagram: medio, Facebook: largo)`;

  const response = await fetch(
    `${process.env.AI_API_BASE_URL || "https://api.openai.com/v1"}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "gemini-2.0-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  const match = text.match(/```json\s*([\s\S]*?)```/);
  const jsonStr = match ? match[1] : text;
  const parsed = JSON.parse(jsonStr.trim()) as { pieces: ContentPieceInput[] };
  return parsed.pieces;
}

function generateMockStrategy(
  idea: string,
  product: string,
  objective: string,
  audience: string,
  platforms: string[],
  style: string,
  offer: string
): CampaignStrategy {
  const topic = product || idea.slice(0, 60);
  return {
    campaignName: `Campaña: ${topic.slice(0, 30)}`,
    objective: objective || "Generar consultas cualificadas y aumentar la visibilidad de la marca",
    targetAudience: audience || "Personas interesadas en el sector,年龄 25-55, usuarios activos de redes sociales en Argentina",
    painPoints: [
      "No saben cómo elegir el servicio adecuado",
      "Han tenido malas experiencias anteriores",
      "Les preocupa el costo de la inversión",
      "No ven resultados claros de otros proveedores",
    ],
    desires: [
      "Encontrar un proveedor confiable y profesional",
      "Obtener resultados visibles rápidamente",
      "Sentir que están tomando la decisión correcta",
      "Poder recomendarlo a otros con confianza",
    ],
    valueProposition: `Somos la solución que necesitás. Con ${topic}, obtienes resultados profesionales con la confianza que merecés.`,
    communicationAngle: style || "Problema → Solución → Beneficio → Llamada a la acción",
    funnelStages: ["descubrimiento", "consideracion", "conversion", "retencion"],
    contentMix: {
      educational: 10,
      capture: 8,
      objection: 5,
      authority: 4,
      conversion: 3,
    },
  };
}

function generateMockContentPack(
  strategy: CampaignStrategy,
  idea: string,
  product: string,
  platforms: string[],
  count: number
): ContentPieceInput[] {
  const pieces: ContentPieceInput[] = [];
  const hookTypes = [
    "curiosidad", "pregunta", "problema", "beneficio",
    "historia", "dato", "contrarian", "lista", "urgencia", "testimonio",
  ];
  const ctaOptions = [
    "Consultá gratis ahora",
    "Escribinos y te asesoramos",
    "Descubrí cómo funciona",
    "Visitá nuestra página",
    "Probá sin compromiso",
    "Contactános hoy",
    "Agendá tu consulta",
    "Más info en el link",
  ];
  const stages = [
    { stage: "educational", funnelStage: "descubrimiento", count: Math.ceil(count * 0.33) },
    { stage: "capture", funnelStage: "consideracion", count: Math.ceil(count * 0.27) },
    { stage: "objection", funnelStage: "consideracion", count: Math.ceil(count * 0.17) },
    { stage: "authority", funnelStage: "consideracion", count: Math.ceil(count * 0.13) },
    { stage: "conversion", funnelStage: "conversion", count: Math.ceil(count * 0.1) },
  ];

  let idx = 0;
  for (const mix of stages) {
    for (let i = 0; i < mix.count && pieces.length < count; i++) {
      const hookType = hookTypes[idx % hookTypes.length];
      const platform = platforms[idx % platforms.length];
      const topic = product || idea;

      pieces.push({
        title: `${strategy.campaignName} - Pieza ${idx + 1} (${mix.stage})`,
        hook: generateHook(hookType, topic, strategy),
        body: generateBody(mix.stage, topic, strategy, platform),
        cta: ctaOptions[idx % ctaOptions.length],
        contentType: mix.stage,
        funnelStage: mix.funnelStage,
        platform: platform,
        hashtags: generateHashtags(topic, platform),
        keywords: [topic.toLowerCase(), strategy.campaignName.toLowerCase(), "rosario", "argentina"],
        imagePrompt: `Professional advertising photo related to ${topic}, modern style, clean composition, warm colors, vertical format 4:5, marketing aesthetic`,
        score: 75 + Math.floor(Math.random() * 20),
      });
      idx++;
    }
  }

  return pieces;
}

function generateHook(type: string, topic: string, strategy: CampaignStrategy): string {
  const pain = strategy.painPoints[0] || "tener resultados";
  const desire = strategy.desires[0] || "mejorar tu negocio";

  switch (type) {
    case "curiosidad":
      return `Lo que nadie te dice sobre ${topic}...`;
    case "pregunta":
      return `¿${pain}? Te voy a mostrar cómo solucionarlo.`;
    case "problema":
      return `Si estás cansado de ${pain}, esto es para vos.`;
    case "beneficio":
      return `Imaginate poder ${desire}. Es más fácil de lo que pensás.`;
    case "historia":
      return `Hace un tiempo yo también ${pain}. Esto es lo que cambió todo.`;
    case "dato":
      return `El 80% de la gente no sabe que puede ${desire}. ¿Y vos?`;
    case "contrarian":
      return `Todo lo que te dicen sobre ${topic} está mal. Te explico por qué.`;
    case "lista":
      return `5 cosas que necesitás saber antes de contratar ${topic}`;
    case "urgencia":
      return `No esperes más. Tu competitor ya está haciendo esto.`;
    case "testimonio":
      return `Un cliente nos dijo: "No sabía que podía ser tan fácil".`;
    default:
      return `Descubrí todo sobre ${topic} en este post.`;
  }
}

function generateBody(stage: string, topic: string, strategy: CampaignStrategy, platform: string): string {
  const pain = strategy.painPoints[0] || "tener problemas con tu servicio";
  const desire = strategy.desires[0] || "encontrar la solución perfecta";
  const isX = platform === "x";

  const bodies: Record<string, string> = {
    educational: isX
      ? `Sabías que ${pain}? Acá te damos 3 tips para evitarlo. 🧵`
      : `¿Sabías que la mayoría de la gente ${pain}?\n\nTe compartimos 3 consejos que te van a ayudar a ${desire}:\n\n1️⃣ Investigá bien antes de elegir\n2️⃣ Pedí referencias y casos de éxito\n3️⃣ No te guieses solo por el precio\n\n¿Cuál de estos tips te sirvió más? Contanos en los comentarios.`,
    capture: isX
      ? `${pain}? No estás solo. Te ayudamos a encontrar la solución. 🎯`
      : `Si estás ${pain}, no sos el único.\n\nTrabajamos con cientos de personas que pasaron por lo mismo.\n\nLa diferencia está en elegir al proveedor correcto.\n\n¿Querés saber cómo te podemos ayudar? Escribinos por DM.`,
    objection: isX
      ? `"Es muy caro" — El verdadero costo de no invertir. 💡`
      : `"Es muy caro"\n\nEs la excusa más común. Pero analizalo:\n\n❌ No invertir = seguir perdiendo clientes\n❌ Seguir probando proveedores que no funcionan\n❌ Tu competencia ya está invirtiendo\n\n✅ Invertir bien = resultados desde el primer mes\n\nEl costo real es no hacer nada.`,
    authority: isX
      ? `10 años de experiencia en ${topic}. Acá va lo que aprendimos. 📊`
      : `Después de 10 años trabajando en ${topic}, te puedo decir algo con certeza:\n\nLa mayoría de las personas buscan lo mismo:\n✅ Resultados reales\n✅ Atención profesional\n✅ Precio justo\n\nY eso es exactamente lo que ofrecemos.\n\nNo somos perfectos, pero somos constantes. Y eso vale más que cualquier promesa.`,
    conversion: isX
      ? `Último lugar disponible para esta semana. ¿Agendamos? 🗓️`
      : `🔥 OFERTA ESPECIAL\n\nSolo quedan 3 lugares esta semana para una consulta gratis.\n\nSin compromiso. Sin letra chica.\n\n¿Qué perdés en 15 minutos? Nada.\n¿Qué ganás? Una solución concreta.\n\nEscribinos ahora y agendamos tu consulta.`,
  };

  return bodies[stage] || bodies.educational;
}

function generateHashtags(topic: string, platform: string): string[] {
  const base = topic
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/\s+/)
    .filter((w: string) => w.length > 3)
    .slice(0, 3)
    .map((w: string) => `#${w}`);

  const platformHashtags: Record<string, string[]> = {
    instagram: ["#instagood", "#reels", "#marketingdigital", "#emprendedores", "#rosario"],
    tiktok: ["#fyp", "#viral", "#trending", "#foryou", "#rosario"],
    facebook: ["#comunidad", "#negocios", "#emprendimiento", "#rosario", "#argentina"],
    x: ["#marketing", "#negocios", "#emprendedores", "#rosario"],
    youtube: ["#shorts", "#youtube", "#tutorial", "#rosario"],
    linkedin: ["#profesional", "#negocios", "#industria", "#rosario", "#argentina"],
  };

  const platformTags = platformHashtags[platform] || platformHashtags.instagram;
  return [...base, ...platformTags.slice(0, 5)];
}

export const generateCampaign = action({
  args: {
    idea: v.string(),
    product: v.optional(v.string()),
    objective: v.string(),
    audience: v.optional(v.string()),
    platforms: v.array(v.string()),
    style: v.optional(v.string()),
    offer: v.optional(v.string()),
    url: v.optional(v.string()),
    contentCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();

    try {
      const strategy = await callAIForCampaignStrategy(
        args.idea,
        args.product || "",
        args.objective,
        args.audience || "",
        args.platforms,
        args.style || "",
        args.offer || ""
      );

    const campaignId = await ctx.runMutation(api.campaigns.create, {
        name: strategy.campaignName,
        description: strategy.valueProposition,
        idea: args.idea,
        objective: strategy.objective,
        targetAudience: strategy.targetAudience,
        painPoints: strategy.painPoints.join("\n"),
        desires: strategy.desires.join("\n"),
        valueProposition: strategy.valueProposition,
        funnelStage: strategy.funnelStages.join(","),
        communicationAngle: strategy.communicationAngle,
        platforms: args.platforms,
        style: args.style || "profesional",
        offer: args.offer,
        url: args.url,
        status: "DRAFT",
        contentCount: 0,
        publishedCount: 0,
      });

      const contentCount = args.contentCount || 30;
      const pieces = await callAIForContentPack(
        strategy,
        args.idea,
        args.product || "",
        args.platforms,
        contentCount
      );

      const packId = await ctx.runMutation(api.contentPacks.create, {
        campaignId,
        name: `Pack: ${strategy.campaignName}`,
        description: `Content pack generado para la campaña ${strategy.campaignName}`,
        totalPieces: pieces.length,
        generatedPieces: pieces.length,
        status: "GENERATED",
        distribution: strategy.contentMix,
        generatedAt: Date.now(),
      });

      const savedPieceIds: string[] = [];
      for (const piece of pieces) {
        const pieceId = await ctx.runMutation(api.contentPieces.create, {
          contentPackId: packId,
          campaignId,
          title: piece.title,
          hook: piece.hook,
          body: piece.body,
          cta: piece.cta,
          contentType: piece.contentType,
          funnelStage: piece.funnelStage,
          platform: piece.platform || args.platforms[0],
          hashtags: piece.hashtags,
          keywords: piece.keywords,
          imagePrompt: piece.imagePrompt,
          score: piece.score,
          status: "GENERATED",
        });
        savedPieceIds.push(pieceId);
      }

      await ctx.runMutation(api.campaigns.updateContentCount, {
        id: campaignId,
        contentCount: pieces.length,
      });

      await ctx.runMutation(api.auditLogs.create, {
        action: "GENERATE_CAMPAIGN",
        result: "SUCCESS",
        durationMs: Date.now() - startTime,
        metadata: {
          campaignId,
          packId,
          pieceCount: pieces.length,
          platforms: args.platforms,
        },
      });

      await ctx.runMutation(api.aiGenerations.logGeneration, {
        model: process.env.AI_MODEL || "mock",
        operation: "generate_campaign",
        inputTokens: args.idea.length + args.product!.length,
        outputTokens: pieces.length * 200,
        cost: 0.005,
        durationMs: Date.now() - startTime,
        success: true,
      });

      return {
        campaignId,
        packId,
        strategy,
        pieces: pieces.map((p, i) => ({
          ...p,
          id: savedPieceIds[i],
        })),
        totalGenerated: pieces.length,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      await ctx.runMutation(api.auditLogs.create, {
        action: "GENERATE_CAMPAIGN",
        result: "FAILED",
        error: errorMessage,
        durationMs,
      });

      throw error;
    }
  },
});

export const regenerateContentPiece = action({
  args: {
    pieceId: v.id("contentPieces"),
    direction: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const piece = await ctx.runQuery(api.contentPieces.get, { id: args.pieceId });
    if (!piece) throw new Error("Content piece not found");

    const campaign = await ctx.runQuery(api.campaigns.get, { id: piece.campaignId });
    if (!campaign) throw new Error("Campaign not found");

    const hasApiKey = !!process.env.AI_API_KEY;

    if (!hasApiKey) {
      const direction = args.direction || "más profesional";
      const hookTypes = ["curiosidad", "pregunta", "problema", "beneficio", "historia"];
      const randomHook = hookTypes[Math.floor(Math.random() * hookTypes.length)];

      const newHook = generateHook(randomHook, campaign.idea || campaign.name, {
        campaignName: campaign.name,
        objective: campaign.objective || "",
        targetAudience: campaign.targetAudience || "",
        painPoints: (campaign.painPoints || "").split("\n").filter(Boolean),
        desires: (campaign.desires || "").split("\n").filter(Boolean),
        valueProposition: campaign.valueProposition || "",
        communicationAngle: campaign.communicationAngle || "",
        funnelStages: [],
        contentMix: { educational: 0, capture: 0, objection: 0, authority: 0, conversion: 0 },
      });

      await ctx.runMutation(api.contentPieces.update, {
        id: args.pieceId,
        hook: newHook,
        score: Math.min(100, piece.score + Math.floor(Math.random() * 10) - 3),
      });

      return { success: true, newHook, direction };
    }

    const systemPrompt = `Sos un experto en copywriting para redes sociales en Argentina.
Regenerá el contenido con un enfoque ${args.direction || "más profesional"}.
Responde SIEMPRE con JSON válido.`;

    const userPrompt = `Regenerá esta pieza de contenido:

TÍTULO ACTUAL: "${piece.title}"
HOOK ACTUAL: "${piece.hook}"
BODY ACTUAL: "${piece.body}"
CTA ACTUAL: "${piece.cta}"
DIRECCIÓN: "${args.direction || "más profesional"}"

Respondé con JSON:
{
  "title": "nuevo título",
  "hook": "nuevo gancho",
  "body": "nuevo cuerpo",
  "cta": "nuevo CTA",
  "hashtags": ["#tag1", "#tag2"],
  "score": 85
}`;

    const response = await fetch(
      `${process.env.AI_API_BASE_URL || "https://api.openai.com/v1"}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.AI_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.AI_MODEL || "gemini-2.0-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.8,
        }),
      }
    );

    if (!response.ok) throw new Error(`AI API error: ${response.status}`);

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    const match = text.match(/```json\s*([\s\S]*?)```/);
    const jsonStr = match ? match[1] : text;
    const parsed = JSON.parse(jsonStr.trim());

    await ctx.runMutation(api.contentPieces.update, {
      id: args.pieceId,
      title: parsed.title || piece.title,
      hook: parsed.hook || piece.hook,
      body: parsed.body || piece.body,
      cta: parsed.cta || piece.cta,
      hashtags: parsed.hashtags || piece.hashtags,
      score: parsed.score || piece.score,
    });

    return { success: true, ...parsed, direction: args.direction };
  },
});

export const getContentPack = action({
  args: {
    packId: v.id("contentPacks"),
  },
  handler: async (ctx, args) => {
    const pack = await ctx.runQuery(api.contentPacks.get, { id: args.packId });
    if (!pack) throw new Error("Content pack not found");

    const pieces = await ctx.runQuery(api.contentPieces.getByPack, {
      packId: args.packId,
    });

    const campaign = await ctx.runQuery(api.campaigns.get, { id: pack.campaignId });

    return {
      pack,
      pieces,
      campaign,
    };
  },
});
