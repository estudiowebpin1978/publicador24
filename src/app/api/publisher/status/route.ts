import { NextResponse } from "next/server";
import { getProviderStatus } from "@/lib/publisher/rotation";
import { getChannels } from "@/lib/bulkpublish/client";
import { getMetaConfigAsync } from "@/lib/meta/graph";

export async function GET() {
  try {
    const status = await getProviderStatus();

    let bulkpublishChannels: unknown[] = [];
    try {
      bulkpublishChannels = await getChannels();
    } catch {}

    const metaConfig = await getMetaConfigAsync();

    return NextResponse.json({
      providers: status,
      meta: {
        configured: !!metaConfig,
        pageId: metaConfig?.pageId || process.env.META_PAGE_ID || null,
        hasToken: !!metaConfig?.pageAccessToken,
        hasIgId: !!metaConfig?.instagramBusinessId,
      },
      bulkpublish: {
        channels: bulkpublishChannels,
        channelsCount: bulkpublishChannels.length,
        configured: !!process.env.BULKPUBLISH_API_KEY,
      },
      rotation: status.activeOrder.join(" → "),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "error" },
      { status: 500 }
    );
  }
}
