import { NextRequest, NextResponse } from "next/server";
import { generateVideoAssets } from "@/lib/ai/video-generator";
import { assembleVideo } from "@/lib/ai/video-assembler";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, hook, cta, platform, style, voice } = body;

    if (!content?.trim()) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    // Generate scene assets
    const assets = await generateVideoAssets({
      content,
      hook: hook || "Mirá esto que no sabías",
      cta: cta || "Consultanos ahora",
      platform: platform || "instagram",
      style: style || "profesional",
      voice: voice || "es-AR-Standard-A",
    });

    // Assemble into real .mp4
    const isVertical = platform === "tiktok" || platform === "instagram";
    const videoUrl = await assembleVideo({
      scenes: assets.scenes.map((s) => ({
        imageUrl: s.image.url,
        text: s.text,
        duration: s.duration,
      })),
      audioUrl: assets.narration?.audioUrl || undefined,
      outputWidth: isVertical ? 720 : 1280,
      outputHeight: isVertical ? 1280 : 720,
      fps: 30,
    });

    return NextResponse.json({
      success: true,
      video: {
        url: videoUrl,
        title: assets.title,
        scenes: assets.scenes.map((s) => ({
          id: s.id,
          text: s.text,
          imageUrl: s.image.url,
          duration: s.duration,
          transition: s.transition,
        })),
        totalDuration: assets.totalDuration,
        narrationUrl: assets.narration?.audioUrl || null,
        format: isVertical ? "9:16" : "16:9",
        platform,
      },
    });
  } catch (error) {
    console.error("Video generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Error generating video", details: message },
      { status: 500 }
    );
  }
}
