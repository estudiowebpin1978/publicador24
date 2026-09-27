import { NextResponse } from "next/server";
import { generateYouTubeVideoWithShotstack, isShotstackConfigured } from "@/lib/video/shotstack";

export async function GET() {
  const configured = isShotstackConfigured();
  
  if (!configured) {
    return NextResponse.json({ 
      configured: false, 
      error: "Shotstack not configured" 
    });
  }

  try {
    const result = await import("@/lib/video/shotstack").then(m => 
      m.generateYouTubeVideoWithShotstack({
        title: "Test",
        description: "Test Shotstack from debug endpoint",
        thumbnailUrl: undefined,
        script: undefined,
        images: [],
        duration: 5,
      })
    );

    return NextResponse.json({
      configured: true,
      shotstackResult: result,
    });
  } catch (e) {
    return NextResponse.json({
      configured: true,
      error: e instanceof Error ? e.message : "Unknown error",
      stack: e instanceof Error ? e.stack : undefined,
    });
  }
}