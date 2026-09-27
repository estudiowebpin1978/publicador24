import { NextRequest, NextResponse } from "next/server";
import { getBufferAccount, getBufferChannels, isBufferRateLimited } from "@/lib/buffer/client";

export async function GET() {
  if (await isBufferRateLimited()) {
    return NextResponse.json({ accounts: [], error: "Buffer rate limited — retry later" });
  }
  try {
    const account = await getBufferAccount();
    const orgId = account.account.organizations[0]?.id;
    if (!orgId) {
      return NextResponse.json({ accounts: [], error: "No organization found" });
    }

    const channels = await getBufferChannels(orgId);

    const accounts = channels.map((ch) => ({
      _id: ch.id,
      platform: ch.service,
      displayName: ch.displayName,
      username: ch.name,
      avatarUrl: ch.avatar,
      status: ch.isDisconnected ? "disconnected" : "connected",
      tokenStatus: "valid",
      permissions: ["read", "write"],
    }));

    return NextResponse.json({ accounts });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    const isRate = /too many requests/i.test(msg);
    return NextResponse.json(
      { accounts: [], error: msg },
      { status: isRate ? 200 : 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: "Account ID required" }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Disconnect from Buffer dashboard" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
