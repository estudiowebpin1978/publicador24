import { generateTextWithFallback } from "@/lib/ai/multi-provider";

type Lang = "en" | "pt" | "es";

interface Content {
  hook: string;
  body: string;
  cta: string;
  hashtags: string[];
}

const LANG_NAMES: Record<Lang, string> = {
  en: "English",
  pt: "Portuguese",
  es: "Spanish",
};

export async function translateContent(
  content: Content,
  targetLang: Lang
): Promise<Content> {
  const langName = LANG_NAMES[targetLang];

  const systemPrompt = `You are an expert multilingual marketing copywriter. Translate the following social media content to ${langName}. Maintain the marketing tone, emotional hooks, and call-to-action energy. For hashtags, translate them if appropriate or keep them relevant to the target audience. Respond ONLY with valid JSON, no additional text.`;

  const prompt = `Translate this social media content to ${langName}:

Hook: ${content.hook}
Body: ${content.body}
CTA: ${content.cta}
Hashtags: ${content.hashtags.join(", ")}

Respond with JSON:
{
  "hook": "translated hook",
  "body": "translated body",
  "cta": "translated CTA",
  "hashtags": ["#translated1", "#translated2"]
}`;

  const result = await generateTextWithFallback(prompt, systemPrompt);

  try {
    const match = result.text.match(/```json\s*([\s\S]*?)```/);
    const jsonStr = match ? match[1] : result.text;
    const parsed = JSON.parse(jsonStr.trim());
    return {
      hook: parsed.hook || content.hook,
      body: parsed.body || content.body,
      cta: parsed.cta || content.cta,
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : content.hashtags,
    };
  } catch {
    return content;
  }
}
