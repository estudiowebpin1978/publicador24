import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function sendWhatsAppNotification(message: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  try {
    await supabase.from("whatsapp_notifications").insert({
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
