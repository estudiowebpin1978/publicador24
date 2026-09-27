import { NextResponse } from "next/server";
import { getChannels, listPosts, deletePost, isBulkPublishRateLimited } from "@/lib/bulkpublish/client";
import { claimCleanupRun, releaseCleanupRun } from "@/lib/cleanup-throttle";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const KEEP_POSTS = 3;
// Limpieza como máximo 2 veces al día: BulkPublish solo da 30 llamadas/día y
// cada corrida gasta 1 (canales) + 1 por canal. El cron corre cada 15 min: sin
// este gate se consumía toda la cuota en ~2h y TikTok nunca alcanzaba a publicar.
const CLEANUP_INTERVAL_MS = 12 * 60 * 60 * 1000;

export async function POST() {
  try {
    if (isBulkPublishRateLimited()) {
      return NextResponse.json({ cleaned: 0, message: "BulkPublish rate limited — skip" });
    }

    const gate = await claimCleanupRun("bulkpublish", CLEANUP_INTERVAL_MS);
    if (!gate.run) {
      const minutes = Math.max(1, Math.round(gate.nextRunInMs / 60_000));
      return NextResponse.json({
        cleaned: 0,
        skipped: true,
        message: `BulkPublish: limpieza programada en ${minutes} min`,
      });
    }

    let channels;
    try {
      channels = await getChannels();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      // No consumimos el turno: al liberarse la cuota se reintenta más pronto.
      await releaseCleanupRun("bulkpublish");
      return NextResponse.json({
        cleaned: 0,
        message: /rate limited|quota/i.test(msg)
          ? "BulkPublish sin cupo — se retoma mañana"
          : `BulkPublish no disponible: ${msg.slice(0, 120)}`,
      });
    }

    let cleaned = 0;
    const details: string[] = [];
    const supabase = getSupabaseAdmin();

    for (const ch of channels) {
      try {
        const posts = await listPosts(ch.id, 50);
        const pending = posts.filter((p) => p.status === "scheduled" || p.status === "draft");

        if (pending.length <= KEEP_POSTS) {
          details.push(`${ch.platform}: ${pending.length} pendientes (ok)`);
          continue;
        }

        const toDelete = pending.slice(KEEP_POSTS);
        for (const post of toDelete) {
          const ok = await deletePost(post.id);
          if (ok) {
            cleaned++;
            try {
              await supabase
                .from("scheduled_posts")
                .update({ status: "cancelled" })
                .eq("external_post_id", String(post.id));
            } catch {}
          }
          await sleep(200);
        }

        details.push(`${ch.platform}: ${toDelete.length} eliminados, ${pending.length - toDelete.length} restantes`);
      } catch (e) {
        details.push(`${ch.platform}: ${e instanceof Error ? e.message : "error"}`);
      }
      await sleep(300);
    }

    return NextResponse.json({ cleaned, details, message: `BulkPublish: ${cleaned} liberados` });
  } catch (e) {
    return NextResponse.json({ cleaned: 0, error: e instanceof Error ? e.message : "error" }, { status: 500 });
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
