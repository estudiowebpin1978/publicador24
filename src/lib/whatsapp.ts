import { getSupabaseAdmin } from "@/lib/supabase/server";

const WHATSAPP_PHONE = "5493412500029";
const WHATSAPP_API_URL = "https://api.whatsapp.com/send";

export function getWhatsAppUrl(message: string): string {
  const encoded = encodeURIComponent(message);
  return `${WHATSAPP_API_URL}?phone=${WHATSAPP_PHONE}&text=${encoded}`;
}

export async function sendWhatsAppNotification(message: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const url = getWhatsAppUrl(message);

  try {
    await supabase.from("whatsapp_notifications").insert({
      type: "system",
      title: "Notificación",
      message,
      status: "pending",
      created_at: Date.now(),
    });
    return true;
  } catch {
    return false;
  }
}

export async function notifyNewLead(lead: { name: string; email: string; campaign: string }): Promise<boolean> {
  const message = `Nuevo lead: ${lead.name} (${lead.email}) en campaña ${lead.campaign}`;
  return sendWhatsAppNotification(message);
}

export async function notifyPostPublished(post: { platform: string; content: string; scheduledAt: string }): Promise<boolean> {
  const message = `Post publicado en ${post.platform}: "${post.content.substring(0, 100)}..." programado para ${post.scheduledAt}`;
  return sendWhatsAppNotification(message);
}

export async function notifyAutopilotResult(result: {
  contentGenerated: number;
  contentPublished: number;
  errors: number;
}): Promise<boolean> {
  const message = `Autopilot: ${result.contentGenerated} generados, ${result.contentPublished} publicados, ${result.errors} errores`;
  return sendWhatsAppNotification(message);
}
