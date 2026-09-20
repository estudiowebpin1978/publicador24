const YOUTUBE_CLIENT_ID = "197688740927-424b24ggfjps171uqbccdmhsqjtgdhp7.apps.googleusercontent.com";
const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3";

export async function createYouTubeVideo(title: string, description: string, videoUrl: string, accessToken?: string): Promise<{ videoId?: string; url?: string; error?: string }> {
  try {
    if (!accessToken) {
      return { error: "YouTube access token required. Authorize with: https://accounts.google.com/o/oauth2/v2/auth?client_id=" + YOUTUBE_CLIENT_ID + "&redirect_uri=https://autopublicador-zeta.vercel.app/api/auth/youtube/callback&scope=https://www.googleapis.com/auth/youtube.upload&response_type=code&access_type=offline" };
    }

    // Insert video metadata
    const res = await fetch(`${YOUTUBE_API_URL}/videos?part=snippet,status,contentDetails&key=${process.env.YOUTUBE_API_KEY || ""}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        snippet: { title, description, tags: ["quiniela", "loteria", "predicciones", "ia"], categoryId: "27" },
        status: { privacyStatus: "public" },
        contentDetails: { videoId: videoUrl }
      })
    });

    const data = await res.json();
    if (data.id) return { videoId: data.id, url: `https://youtube.com/watch?v=${data.id}` };
    return { error: data.error?.message || "YouTube upload failed" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "YouTube error" };
  }
}

export async function getYouTubeAuthUrl(): string {
  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${YOUTUBE_CLIENT_ID}&redirect_uri=https://autopublicador-zeta.vercel.app/api/auth/youtube/callback&scope=https://www.googleapis.com/auth/youtube.upload%20https://www.googleapis.com/auth/youtube.readonly&response_type=code&access_type=offline`;
}
