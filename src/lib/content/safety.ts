import { getAIProvider } from '@/lib/ai/provider';

export type SafetyCategory = 'hate' | 'violence' | 'sexual' | 'fraud' | 'spam' | 'illegal' | 'dubious';

export type SafetyRiskLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ModerateContentInput {
  content: string;
  platform?: string;
  language?: string;
}

export interface ModerateContentResult {
  safe: boolean;
  risk_level: SafetyRiskLevel;
  categories: SafetyCategory[];
  reasons: string[];
  suggestion?: string;
  blocked: boolean;
}

const LOCAL_PATTERNS: Array<{ pattern: RegExp; category: SafetyCategory; risk: SafetyRiskLevel }> = [
  { pattern: /\b(mata|asesina|muerte|odio|destruir)\b/gi, category: 'violence', risk: 'HIGH' },
  { pattern: /\b(estafa|fraude|phishing|hackear|robar)\b/gi, category: 'fraud', risk: 'HIGH' },
  { pattern: /\b(droga|cocaína|heroina|marihuana|paco)\b/gi, category: 'illegal', risk: 'HIGH' },
  { pattern: /\b(sexo explícito|pornografía|xxx|nsfw)\b/gi, category: 'sexual', risk: 'HIGH' },
  { pattern: /\b(compra ahora|100% gratis|dinero fácil|hazte rico)\b/gi, category: 'spam', risk: 'MEDIUM' },
  { pattern: /\b(los judíos|los negros|los gays|discriminar)\b/gi, category: 'hate', risk: 'CRITICAL' },
];

function localModeration(content: string): {
  categories: SafetyCategory[];
  risk_level: SafetyRiskLevel;
  reasons: string[];
} {
  const categories: SafetyCategory[] = [];
  const reasons: string[] = [];
  let highestRisk: SafetyRiskLevel = 'NONE';

  const riskOrder: SafetyRiskLevel[] = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

  for (const { pattern, category, risk } of LOCAL_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      if (!categories.includes(category)) categories.push(category);
      reasons.push(`${category}: "${matches[0]}" detectado`);
      if (riskOrder.indexOf(risk) > riskOrder.indexOf(highestRisk)) {
        highestRisk = risk;
      }
    }
  }

  return { categories, risk_level: highestRisk, reasons };
}

function mergeResults(
  local: ReturnType<typeof localModeration>,
  aiResult: { safe: boolean; risk_level: SafetyRiskLevel; categories: SafetyCategory[]; reasons: string[] } | null
): ModerateContentResult {
  const allCategories = new Set<SafetyCategory>(local.categories);
  const allReasons = [...local.reasons];
  let highestRisk: SafetyRiskLevel = local.risk_level;

  if (aiResult) {
    for (const cat of aiResult.categories) allCategories.add(cat);
    allReasons.push(...aiResult.reasons);

    const riskOrder: SafetyRiskLevel[] = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    if (riskOrder.indexOf(aiResult.risk_level) > riskOrder.indexOf(highestRisk)) {
      highestRisk = aiResult.risk_level;
    }
  }

  const categories = [...allCategories];
  const blocked = highestRisk === 'HIGH' || highestRisk === 'CRITICAL';

  return {
    safe: highestRisk === 'NONE' || highestRisk === 'LOW',
    risk_level: highestRisk,
    categories,
    reasons: allReasons,
    blocked,
  };
}

export async function moderateContent(input: ModerateContentInput): Promise<ModerateContentResult> {
  const local = localModeration(input.content);

  if (local.risk_level === 'CRITICAL') {
    return mergeResults(local, null);
  }

  try {
    const provider = getAIProvider();
    const result = await provider.generateText({
      prompt: `Evalúa este contenido para moderación. Responde con JSON: {"safe":bool,"risk_level":"NONE|LOW|MEDIUM|HIGH|CRITICAL","categories":[],"reasons":[]}\n\nContenido: "${input.content}"`,
      system_prompt: 'Eres un moderador de contenido. Responde solo con JSON válido.',
      max_tokens: 200,
      temperature: 0.1,
    });

    const parsed = JSON.parse(result.text);
    return mergeResults(local, {
      safe: parsed.safe,
      risk_level: parsed.risk_level,
      categories: parsed.categories || [],
      reasons: parsed.reasons || [],
    });
  } catch {
    return mergeResults(local, null);
  }
}
