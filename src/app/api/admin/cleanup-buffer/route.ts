import { NextRequest, NextResponse } from "next/server";
import { getBufferAccount, getBufferChannels, getBufferPosts, deleteBufferPost } from "@/lib/buffer/client";

export async function POST() {
  try {
    const account = await getBufferAccount();
    const orgId = account.account.organizations[0]?.id || "";
    if (!orgId) return NextResponse.json({ cleaned: 0, message: "No org" });

    const channels = await getBufferChannels(orgId);
    const targetChannels = channels.filter(ch => ch.service === "tiktok" || ch.service === "facebook");
    let cleaned = 0;

    for (const ch of targetChannels) {
      const posts = await getBufferPosts(ch.id, 20);
      // Delete ALL posts (scheduled and sent) to fully clear the queue
      for (const post of posts) {
        const ok = await deleteBufferPost(post.id);
        if (ok) cleaned++;
      }
    }

    return NextResponse.json({ cleaned, message: `Liberados ${cleaned} posts` });
  } catch (e) {
    return NextResponse.json({ cleaned: 0, error: e instanceof Error ? e.message : "error" }, { status: 500 });
  }
}
