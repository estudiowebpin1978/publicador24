import { NextResponse } from "next/server";
import { getBufferAccount, getBufferChannels, getBufferPosts, deleteBufferPost, isBufferRateLimited } from "@/lib/buffer/client";
import { claimCleanupRun, releaseCleanupRun } from "@/lib/cleanup-throttle";
import { getSupabaseAdmin } from "@/lib/supabase/server";

// Limpieza como máximo 1 vez por hora: cada corrida son varias llamadas a
// Buffer y su rate limit por "client" persiste media hora.
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

export async function POST() {
  try {
    if (await isBufferRateLimited()) {
      return NextResponse.json({ cleaned: 0, message: "Buffer rate limited — skip" });
    }

    const gate = await claimCleanupRun("buffer", CLEANUP_INTERVAL_MS);
    if (!gate.run) {
      const minutes = Math.max(1, Math.round(gate.nextRunInMs / 60_000));
      return NextResponse.json({
        cleaned: 0,
        skipped: true,
        message: `Buffer: limpieza programada en ${minutes} min`,
      });
    }

    const account = await getBufferAccount();
    const orgId = account.account.organizations[0]?.id || "";
    if (!orgId) {
      await releaseCleanupRun("buffer");
      return NextResponse.json({ cleaned: 0, message: "No org" });
    }

    const channels = await getBufferChannels(orgId);
    const targetChannels = channels.filter(ch => !ch.isDisconnected);
    let cleaned = 0;
    const details: string[] = [];
    const supabase = getSupabaseAdmin();

    // Process one channel at a time with minimal API calls
    for (const ch of targetChannels) {
      try {
        // Single API call to get posts
        const posts = await getBufferPosts(ch.id, 10);

        // If under limit, skip
        if (posts.length < 8) {
          details.push(`${ch.service}: ${posts.length} posts (ok)`);
          continue;
        }

        // Delete oldest posts to get to 5
        const toDelete = posts.slice(5);
        for (const post of toDelete) {
          const ok = await deleteBufferPost(post.id);
          if (ok) {
            cleaned++;
            // Update Supabase
            try {
              await supabase
                .from("scheduled_posts")
                .update({ status: "cancelled" })
                .eq("external_post_id", post.id);
            } catch {}
          }
        }

        details.push(`${ch.service}: ${toDelete.length} eliminados, ${posts.length - toDelete.length} restantes`);
      } catch (e) {
        details.push(`${ch.service}: ${e instanceof Error ? e.message : "error"}`);
      }
    }

    return NextResponse.json({ cleaned, details, message: `Liberados ${cleaned} posts` });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    if (/too many requests|rate limited/i.test(msg)) {
      await releaseCleanupRun("buffer");
      return NextResponse.json({ cleaned: 0, message: "Buffer rate limited — skip" });
    }
    return NextResponse.json({ cleaned: 0, error: msg }, { status: 500 });
  }
}
