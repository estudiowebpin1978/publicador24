const YOUTUBE_CLIENT_ID = "197688740927-424b24ggfjps171uqbccdmhsqjtgdhp7.apps.googleusercontent.com";
const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3";
const YOUTUBE_CHANNEL_ID = "UC..."; // Se llena tras primera autorización

async function refreshYouTubeToken(refreshToken: string): Promise<string | null> {
  try {
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientSecret) return null;

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: YOUTUBE_CLIENT_ID,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }).toString(),
    });

    const data = await res.json();
    if (data.access_token) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/server");
      const supabase = getSupabaseAdmin();
      await supabase
        .from("social_accounts")
        .update({
          access_token: data.access_token,
          refresh_token: data.refresh_token || refreshToken,
          updated_at: Date.now(),
        })
        .eq("platform", "youtube")
        .eq("user_id", "00000000-0000-0000-0000-000000000000");

      return data.access_token;
    }
    return null;
  } catch {
    return null;
  }
}

export async function tryGetSavedToken(): Promise<string | null> {
  try {
    const { getSupabaseAdmin } = await import("@/lib/supabase/server");
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("social_accounts")
      .select("access_token, refresh_token")
      .eq("platform", "youtube")
      .eq("user_id", "00000000-0000-0000-0000-000000000000")
      .single();

    if (data?.access_token && data.access_token !== "PENDING_EXCHANGE") {
      const testRes = await fetch(
        "https://www.googleapis.com/youtube/v3/channels?part=id&mine=true",
        { headers: { Authorization: `Bearer ${data.access_token}` } }
      );

      if (testRes.ok) {
        return data.access_token;
      }

      if (data.refresh_token) {
        const newToken = await refreshYouTubeToken(data.refresh_token);
        if (newToken) return newToken;
      }
    }

    // Fallback: si la DB no tiene token utilizable (fila borrada, refresh
    // revocado), se usa el par de env vars como última opción.
    const envAccess = process.env.YOUTUBE_ACCESS_TOKEN;
    const envRefresh = process.env.YOUTUBE_REFRESH_TOKEN;
    if (envAccess && envAccess !== "PENDING_EXCHANGE") {
      const testRes = await fetch(
        "https://www.googleapis.com/youtube/v3/channels?part=id&mine=true",
        { headers: { Authorization: `Bearer ${envAccess}` } }
      );
      if (testRes.ok) return envAccess;
    }
    if (envRefresh) {
      const newToken = await refreshYouTubeToken(envRefresh);
      if (newToken) return newToken;
    }

    return null;
  } catch {
    return null;
  }
}

export async function uploadVideoToYouTube(
  accessToken: string,
  videoBlob: Blob,
  title: string,
  description: string
): Promise<{ videoId?: string; url?: string; error?: string }> {
  const initRes = await fetch(
    `https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status&uploadType=resumable`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": "video/*",
      },
      body: JSON.stringify({
        snippet: {
          title,
          description,
          tags: ["quiniela", "loteria", "predicciones", "ia", "quiniela ia"],
          categoryId: "27",
        },
        status: { privacyStatus: "public" },
      }),
    }
  );

  if (!initRes.ok) {
    const errBody = await initRes.text();
    return { error: `YouTube upload init failed: ${errBody}` };
  }

  const uploadUrl = initRes.headers.get("Location");
  if (!uploadUrl) {
    return { error: "No upload URL received from YouTube" };
  }

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "video/*" },
    body: videoBlob,
  });

  const uploadData = await uploadRes.json();

  if (!uploadRes.ok) {
    return { error: `YouTube upload failed: ${uploadData.error?.message || "Unknown error"}` };
  }

  if (!uploadData.id) {
    return { error: "YouTube upload: no video ID returned" };
  }

  return { videoId: uploadData.id, url: `https://youtube.com/watch?v=${uploadData.id}` };
}

export async function uploadVideoUrlToYouTube(
  accessToken: string,
  videoUrl: string,
  title: string,
  description: string
): Promise<{ videoId?: string; url?: string; error?: string }> {
  const res = await fetch(videoUrl, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) {
    return { error: `No se pudo descargar el video (${res.status})` };
  }
  const blob = await res.blob();
  if (!blob || blob.size === 0) {
    return { error: "Video vacio" };
  }
  return uploadVideoToYouTube(accessToken, blob, title, description);
}

async function tryShotstackVideo(
  accessToken: string,
  title: string,
  description: string
): Promise<{ videoId?: string; url?: string; error?: string } | null> {
  try {
    const { isShotstackConfigured } = await import("@/lib/video/shotstack");
    
    if (!isShotstackConfigured()) {
      return null;
    }

    console.log("[YouTube] Generating video with Shotstack...");
    
const shotstackModule = await import("@/lib/video/shotstack");
        const shotstackResult = await shotstackModule.generateYouTubeVideoWithShotstack({
          title,
          description,
          thumbnailUrl: undefined,
          script: undefined,
          images: [],
          duration: 3, // very short video for faster render
        });

    if (!shotstackResult.videoUrl) {
      return null;
    }

    console.log(`[Shotstack] Video generated: ${shotstackResult.videoUrl}`);
    
    // Download video and upload to YouTube
    const videoRes = await fetch(shotstackResult.videoUrl);
    if (!videoRes.ok) {
      return { error: `Failed to download Shotstack video: ${videoRes.status}` };
    }
    
const shotstackVideoBlob = await videoRes.blob();
  
  return uploadVideoToYouTube(
    accessToken,
    shotstackVideoBlob,
    title,
    `${description}\n\n#quiniela #loteria #predicciones #ia #quinielaia`
  );
  } catch (e) {
    console.warn("[Shotstack] Failed:", e);
    return { error: e instanceof Error ? e.message : "Shotstack error" };
  }
}

export async function createYouTubeVideo(
  title: string,
  description: string,
  videoUrl: string,
  accessToken?: string
): Promise<{ videoId?: string; url?: string; error?: string }> {
  try {
    if (!accessToken) {
      return { error: "YouTube access token required. Authorize at /api/auth/youtube/callback" };
    }

    const isVideoFile = videoUrl && /\.(mp4|mov|webm|avi)$/i.test(videoUrl);

    if (isVideoFile) {
      const initRes = await fetch(
        `https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status&uploadType=resumable`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "X-Upload-Content-Type": "video/*",
          },
          body: JSON.stringify({
            snippet: {
              title,
              description,
              tags: ["quiniela", "loteria", "predicciones", "ia", "quiniela ia"],
              categoryId: "27",
            },
            status: { privacyStatus: "public" },
          }),
        }
      );

      if (initRes.ok) {
        const uploadUrl = initRes.headers.get("Location");
        if (uploadUrl) {
          const videoRes = await fetch(videoUrl);
          if (videoRes.ok) {
            const blob = await videoRes.blob();
            const uploadRes = await fetch(uploadUrl, {
              method: "PUT",
              headers: { "Content-Type": "video/*" },
              body: blob,
            });
            const data = await uploadRes.json();
            if (data.id) {
              return { videoId: data.id, url: `https://youtube.com/watch?v=${data.id}` };
            }
            return { error: data.error?.message || "Upload failed" };
          }
        }
      }
      const errBody = await initRes.text();
      return { error: `YouTube upload init failed: ${errBody}` };
    }

    // No video file provided — auto-generate with Shotstack (free tier)
    const shotstackResult = await tryShotstackVideo(accessToken, title, description);
    
    if (shotstackResult) {
      return shotstackResult;
    }

    // Fallback: No video generation available
    return { 
      error: "Video generation unavailable (Shotstack not configured or failed). Configure SHOTSTACK_API_KEY for automated videos, or upload .mp4 manually." 
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "YouTube error" };
  }
}

export function getYouTubeAuthUrl(): string {
  const REDIRECT_URI = "https://autopublicador-zeta.vercel.app/api/auth/youtube/callback";
  return `https://accounts.google.com/oauth2/v2/auth?client_id=197688740927-424b24ggfjps171uqbccdmhsqjtgdhp7.apps.googleusercontent.com&redirect_uri=${encodeURIComponent("https://autopublicador-zeta.vercel.app/api/auth/youtube/callback")}&scope=https://www.googleapis.com/auth/youtube.upload%20https://www.googleapis.com/auth/youtube.readonly&response_type=code&access_type=offline`;
}