import { SocialPlatform, PublishResult, PlatformLimits, PostMetrics } from '@/types';
import { createLogger } from '@/lib/logger';
import {
  SocialPlatformAdapter,
  ConnectResult,
  TokenResult,
  ProfileResult,
  ContentValidationInput,
  ContentValidationResult,
  MediaUpload,
  MediaUploadResult,
  PublishInput,
  ScheduleInput,
  ScheduleResult,
  PostStatusResult,
  DateRange,
  AnalyticsResult,
} from '../types';

const log = createLogger({});

const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_UPLOAD = 'https://www.googleapis.com/upload/youtube/v3';

export class YouTubeRealAdapter implements SocialPlatformAdapter {
  platform: SocialPlatform = 'youtube';

  private accessToken: string;

  constructor(accessToken?: string) {
    this.accessToken = accessToken ?? process.env.YOUTUBE_ACCESS_TOKEN ?? '';
  }

  async connectAccount(authorizationCode: string): Promise<ConnectResult> {
    log.info('youtube_connect', 'Intercambiando código por token de YouTube');
    try {
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: authorizationCode,
          client_id: process.env.YOUTUBE_CLIENT_ID ?? '',
          client_secret: process.env.YOUTUBE_CLIENT_SECRET ?? '',
          redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/youtube/callback`,
          grant_type: 'authorization_code',
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error_description ?? data.error);

      return {
        success: true,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_in
          ? new Date(Date.now() + data.expires_in * 1000).toISOString()
          : undefined,
        scopes: data.scope?.split(' ') ?? [],
      };
    } catch (error) {
      log.error('youtube_connect_error', String(error));
      return { success: false, error: String(error) };
    }
  }

  async refreshToken(refreshToken: string): Promise<TokenResult> {
    log.info('youtube_refresh', 'Refrescando token de YouTube');
    try {
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.YOUTUBE_CLIENT_ID ?? '',
          client_secret: process.env.YOUTUBE_CLIENT_SECRET ?? '',
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error_description ?? data.error);
      return {
        success: true,
        access_token: data.access_token,
        expires_at: data.expires_in
          ? new Date(Date.now() + data.expires_in * 1000).toISOString()
          : undefined,
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async disconnectAccount(_accountId: string): Promise<void> {
    log.info('youtube_disconnect', 'Desconectando cuenta de YouTube');
  }

  async getProfile(accessToken: string): Promise<ProfileResult> {
    log.info('youtube_profile', 'Obteniendo perfil de YouTube');
    try {
      const res = await fetch(
        `${YOUTUBE_API}/channels?part=snippet,statistics&mine=true`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const channel = data.items?.[0];
      return {
        success: true,
        user_id: channel?.id ?? '',
        username: channel?.snippet?.title ?? '',
        display_name: channel?.snippet?.title ?? '',
        avatar_url: channel?.snippet?.thumbnails?.default?.url ?? '',
        followers: parseInt(channel?.statistics?.subscriberCount ?? '0', 10),
        permissions: ['youtube.upload', 'youtube'],
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async validateContent(content: ContentValidationInput): Promise<ContentValidationResult> {
    log.info('youtube_validate', 'Validando contenido para YouTube');
    const errors: string[] = [];
    const warnings: string[] = [];
    if (content.caption && content.caption.length > 5000) {
      errors.push('La descripción supera el límite de 5000 caracteres');
    }
    if (content.hashtags && content.hashtags.length > 15) {
      errors.push('No se pueden usar más de 15 hashtags');
    }
    if (content.media && content.media.length > 1) {
      errors.push('YouTube solo permite un video por publicación');
    }
    if (content.media) {
      for (const m of content.media) {
        if (m.type === 'video' && m.duration && m.duration > 60) {
          warnings.push('Los YouTube Shorts no pueden superar los 60 segundos');
        }
      }
    }
    return { valid: errors.length === 0, errors, warnings };
  }

  async uploadMedia(media: MediaUpload): Promise<MediaUploadResult> {
    log.info('youtube_upload', 'Subiendo video a YouTube', { file_type: media.file_type });
    try {
      const initRes = await fetch(
        `${YOUTUBE_UPLOAD}/videos?uploadType=resumable&part=snippet,status`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${media.access_token}`,
            'Content-Type': 'application/json',
            'X-Upload-Content-Type': media.file_type,
          },
          body: JSON.stringify({
            snippet: {
              title: media.caption ?? 'Video subido desde Auto Publisher',
              description: '',
              tags: [],
              categoryId: '22',
            },
            status: {
              privacyStatus: 'public',
              selfDeclaredMadeForKids: false,
            },
          }),
        }
      );
      if (!initRes.ok) throw new Error('Error al inicializar la subida');
      const uploadUrl = initRes.headers.get('Location');
      if (!uploadUrl) throw new Error('No se obtuvo URL de subida');

      const fileBlob = await fetch(media.file_url).then((r) => r.blob());
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': media.file_type },
        body: fileBlob,
      });
      if (!uploadRes.ok) throw new Error('Error al subir el archivo');
      const uploadData = await uploadRes.json();

      return {
        success: true,
        media_id: uploadData.id ?? '',
        media_url: `https://youtube.com/watch?v=${uploadData.id}`,
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async publishPost(post: PublishInput): Promise<PublishResult> {
    log.info('youtube_publish', 'Publicando en YouTube', { caption_length: post.caption.length });
    try {
      const res = await fetch(
        `${YOUTUBE_UPLOAD}/videos?uploadType=resumable&part=snippet,status`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${post.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            snippet: {
              title: post.caption.slice(0, 100),
              description: post.caption,
              tags: post.hashtags ?? [],
              categoryId: '22',
            },
            status: {
              privacyStatus: 'public',
              selfDeclaredMadeForKids: false,
            },
          }),
        }
      );
      if (!res.ok) throw new Error('Error al publicar en YouTube');
      const data = await res.json();

      return {
        success: true,
        platform_post_id: data.id,
        platform_post_url: `https://youtube.com/watch?v=${data.id}`,
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async schedulePost(_post: ScheduleInput): Promise<ScheduleResult> {
    log.info('youtube_schedule', 'Programando en YouTube');
    return {
      success: false,
      error: 'YouTube no soporta programación directa vía API. Subí el video como privado y publícalo después.',
      manual_required: true,
    };
  }

  async getPostStatus(postId: string, accessToken: string): Promise<PostStatusResult> {
    log.info('youtube_status', 'Verificando estado del video', { post_id: postId });
    try {
      const res = await fetch(
        `${YOUTUBE_API}/videos?part=status,processingDetails&id=${postId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const video = data.items?.[0];
      const processingStatus = video?.processingDetails?.processingStatus;
      const status = processingStatus === 'succeeded' ? 'PUBLISHED' : 'PROCESSING';
      return {
        success: true,
        status,
        post_url: `https://youtube.com/watch?v=${postId}`,
      };
    } catch (error) {
      return { success: false, status: 'UNKNOWN', error: String(error) };
    }
  }

  async deletePost(postId: string, accessToken: string): Promise<void> {
    log.info('youtube_delete', 'Eliminando video de YouTube', { post_id: postId });
    await fetch(`${YOUTUBE_API}/videos?id=${postId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async getAnalytics(_accountId: string, dateRange: DateRange): Promise<AnalyticsResult> {
    log.info('youtube_analytics', 'Obteniendo analíticas de YouTube');
    try {
      const res = await fetch(
        `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${dateRange.start}&endDate=${dateRange.end}&metrics=views,likes,comments,shares,estimatedMinutesWatched&dimensions=day`,
        { headers: { Authorization: `Bearer ${this.accessToken}` } }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      let totalViews = 0;
      let totalLikes = 0;
      let totalComments = 0;
      let totalShares = 0;

      if (data.rows) {
        for (const row of data.rows) {
          totalViews += row[1] ?? 0;
          totalLikes += row[2] ?? 0;
          totalComments += row[3] ?? 0;
          totalShares += row[4] ?? 0;
        }
      }

      const result: PostMetrics = {
        views: totalViews,
        likes: totalLikes,
        comments: totalComments,
        shares: totalShares,
      };

      return { success: true, metrics: result };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  getLimits(): PlatformLimits {
    return {
      max_caption_length: 5000,
      max_hashtags: 15,
      max_mentions: 0,
      max_media: 1,
      supported_media_types: ['video'],
      max_video_duration: 60,
      max_video_size: 268435456,
    };
  }

  getAuthUrl(state: string): string {
    const clientId = process.env.YOUTUBE_CLIENT_ID ?? '';
    const scopes = 'youtube.upload,youtube';
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(process.env.YOUTUBE_REDIRECT_URI ?? '')}&scope=${scopes}&response_type=code&access_type=offline&state=${state}`;
  }
}
