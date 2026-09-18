import { generateTextWithFallback } from "@/lib/ai/multi-provider";

interface ReplyContext {
  campaign: string;
  platform: string;
  tone: string;
}

export async function generateReply(
  comment: string,
  context: ReplyContext
): Promise<string> {
  const systemPrompt = `You are a social media community manager. Generate a short, engaging reply (1-2 sentences max) to a user comment. Match the tone: ${context.tone}. Include an appropriate emoji. Keep it natural and on-brand for "${context.campaign}". Never use more than 2 emojis. Never exceed 2 sentences.`;

  const prompt = `Platform: ${context.platform}
Campaign: ${context.campaign}
Tone: ${context.tone}

User comment: "${comment}"

Generate a short, engaging reply that acknowledges the comment and subtly includes a call to action. Reply with ONLY the text, no quotes, no extra formatting.`;

  const result = await generateTextWithFallback(prompt, systemPrompt);

  let reply = result.text.trim();
  reply = reply.replace(/^["']|["']$/g, "").trim();

  if (reply.split(/[.!?]+/).filter(Boolean).length > 2) {
    const sentences = reply.match(/[^.!?]+[.!?]+/g);
    if (sentences && sentences.length > 2) {
      reply = (sentences[0] + sentences[1]).trim();
    }
  }

  return reply;
}
