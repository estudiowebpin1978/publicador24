import { NextRequest, NextResponse } from "next/server";
import { generateVideoAssets } from "@/lib/ai/video-generator";

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

    const result = await generateVideoAssets({
      content,
      hook: hook || "Mirá esto que no sabías",
      cta: cta || "Consultanos ahora",
      platform: platform || "instagram",
      style: style || "profesional",
      voice: voice || "es-AR-Standard-A",
    });

    return NextResponse.json({
      success: true,
      video: {
        title: result.title,
        scenes: result.scenes.map((s) => ({
          id: s.id,
          text: s.text,
          imageUrl: s.image.url,
          duration: s.duration,
          transition: s.transition,
        })),
        totalDuration: result.totalDuration,
        narrationUrl: result.narration?.audioUrl || null,
        format: "9:16",
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
