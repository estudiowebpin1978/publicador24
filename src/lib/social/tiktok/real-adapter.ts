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

const TIKTOK_API = 'https://open.tiktokapis.com/v2';

export class TikTokRealAdapter implements SocialPlatformAdapter {
  platform: SocialPlatform = 'tiktok';

  private accessToken: string;

  constructor(accessToken?: string) {
    this.accessToken = accessToken ?? process.env.TIKTOK_ACCESS_TOKEN ?? '';
  }

  async connectAccount(authorizationCode: string): Promise<ConnectResult> {
    log.info('tiktok_connect', 'Intercambiando código por token de TikTok');
    try {
      const res = await fetch(`${TIKTOK_API}/oauth/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_key: process.env.TIKTOK_CLIENT_KEY ?? '',
          client_secret: process.env.TIKTOK_CLIENT_SECRET ?? '',
          code: authorizationCode,
          grant_type: 'authorization_code',
          redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/tiktok/callback`,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.description ?? data.error.message);

      return {
        success: true,
        account_id: data.data?.open_id ?? '',
        access_token: data.data?.access_token ?? '',
        refresh_token: data.data?.refresh_token ?? '',
        expires_at: data.data?.expires_in
          ? new Date(Date.now() + data.data.expires_in * 1000).toISOString()
          : undefined,
        scopes: data.data?.scope?.split(',') ?? [],
      };
    } catch (error) {
      log.error('tiktok_connect_error', String(error));
      return { success: false, error: String(error) };
    }
  }

  async refreshToken(refreshToken: string): Promise<TokenResult> {
    log.info('tiktok_refresh', 'Refrescando token de TikTok');
    try {
      const res = await fetch(`${TIKTOK_API}/oauth/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_key: process.env.TIKTOK_CLIENT_KEY ?? '',
          client_secret: process.env.TIKTOK_CLIENT_SECRET ?? '',
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.description ?? data.error.message);
      return {
        success: true,
        access_token: data.data?.access_token,
        expires_at: data.data?.expires_in
          ? new Date(Date.now() + data.data.expires_in * 1000).toISOString()
          : undefined,
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async disconnectAccount(_accountId: string): Promise<void> {
    log.info('tiktok_disconnect', 'Desconectando cuenta de TikTok');
  }

  async getProfile(accessToken: string): Promise<ProfileResult> {
    log.info('tiktok_profile', 'Obteniendo perfil de TikTok');
    try {
      const res = await fetch(
        `${TIKTOK_API}/user/info/?fields=display_name,username,follower_count,avatar_url,video_count`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.description ?? data.error.message);
      const user = data.data?.user;
      return {
        success: true,
        user_id: user?.open_id ?? '',
        username: user?.username ?? '',
        display_name: user?.display_name ?? '',
        avatar_url: user?.avatar_url ?? '',
        followers: user?.follower_count ?? 0,
        permissions: ['user.info.basic', 'video.publish', 'video.upload'],
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async validateContent(content: ContentValidationInput): Promise<ContentValidationResult> {
    log.info('tiktok_validate', 'Validando contenido para TikTok');
    const errors: string[] = [];
    const warnings: string[] = [];
    if (content.caption && content.caption.length > 2200) {
      errors.push('El texto supera el límite de 2200 caracteres');
    }
    if (content.hashtags && content.hashtags.length > 30) {
      errors.push('No se pueden usar más de 30 hashtags');
    }
    if (content.media) {
      for (const m of content.media) {
        if (m.type === 'video' && m.duration && m.duration > 600) {
          errors.push('Los videos no pueden superar los 10 minutos');
        }
      }
    }
    if (content.hashtags && content.hashtags.length > 10) {
      warnings.push('Se recomiendan menos de 10 hashtags para mejor rendimiento');
    }
    return { valid: errors.length === 0, errors, warnings };
  }

  async uploadMedia(media: MediaUpload): Promise<MediaUploadResult> {
    log.info('tiktok_upload', 'Subiendo video a TikTok', { file_type: media.file_type });
    try {
      const initRes = await fetch(`${TIKTOK_API}/post/publish/video/init/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${media.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          post_info: {
            title: media.caption ?? '',
            privacy_level: 'PUBLIC_TO_EVERYONE',
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
          },
          source_info: {
            source: 'FILE_UPLOAD',
          },
        }),
      });
      const initData = await initRes.json();
      if (initData.error) throw new Error(initData.error.description ?? initData.error.message);

      const uploadUrl = initData.data?.upload_url;
      if (uploadUrl) {
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          body: await fetch(media.file_url).then((r) => r.blob()),
        });
        if (!uploadRes.ok) throw new Error('Error al subir el archivo de video');
      }

      return {
        success: true,
        media_id: initData.data?.publish_id ?? '',
        media_url: media.file_url,
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async publishPost(post: PublishInput): Promise<PublishResult> {
    log.info('tiktok_publish', 'Publicando en TikTok', { caption_length: post.caption.length });
    try {
      const res = await fetch(`${TIKTOK_API}/post/publish/video/init/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${post.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          post_info: {
            title: post.caption,
            privacy_level: 'PUBLIC_TO_EVERYONE',
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
          },
          source_info: {
            source: 'FILE_UPLOAD',
            video_size: 0,
          },
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.description ?? data.error.message);

      return {
        success: true,
        platform_post_id: data.data?.publish_id,
        platform_post_url: `https://www.tiktok.com/@me/video/${data.data?.publish_id}`,
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async schedulePost(_post: ScheduleInput): Promise<ScheduleResult> {
    log.info('tiktok_schedule', 'Programando en TikTok');
    return {
      success: false,
      error: 'TikTok no soporta programación directa. Usá el programador interno de la app.',
      manual_required: true,
    };
  }

  async getPostStatus(postId: string, accessToken: string): Promise<PostStatusResult> {
    log.info('tiktok_status', 'Verificando estado del post', { post_id: postId });
    try {
      const res = await fetch(
        `${TIKTOK_API}/post/publish/status/?publish_id=${postId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.description ?? data.error.message);
      const statusStr = data.data?.status;
      const status = statusStr === 'PUBLISH_COMPLETE' ? 'PUBLISHED' : 'PROCESSING';
      return {
        success: true,
        status,
        post_url: `https://www.tiktok.com/@me/video/${postId}`,
      };
    } catch (error) {
      return { success: false, status: 'UNKNOWN', error: String(error) };
    }
  }

  async deletePost(postId: string, accessToken: string): Promise<void> {
    log.info('tiktok_delete', 'Eliminando video de TikTok', { post_id: postId });
    await fetch(`${TIKTOK_API}/post/publish/video/delete/?video_id=${postId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async getAnalytics(accountId: string, dateRange: DateRange): Promise<AnalyticsResult> {
    log.info('tiktok_analytics', 'Obteniendo analíticas de TikTok');
    try {
      const res = await fetch(
        `${TIKTOK_API}/post/publish/video/query/?video_ids=${accountId}`,
        { headers: { Authorization: `Bearer ${this.accessToken}` } }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.description ?? data.error.message);

      const video = data.data?.videos?.[0];
      const result: PostMetrics = {
        views: video?.statistics?.play_count ?? 0,
        likes: video?.statistics?.like_count ?? 0,
        comments: video?.statistics?.comment_count ?? 0,
        shares: video?.statistics?.share_count ?? 0,
      };

      return { success: true, metrics: result };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  getLimits(): PlatformLimits {
    return {
      max_caption_length: 2200,
      max_hashtags: 30,
      max_mentions: 10,
      max_media: 12,
      supported_media_types: ['video', 'image'],
      max_video_duration: 600,
      max_video_size: 524288000,
      max_image_size: 10485760,
    };
  }

  getAuthUrl(state: string): string {
    const clientKey = process.env.TIKTOK_CLIENT_KEY ?? '';
    const scopes = 'user.info.basic,video.publish,video.upload';
    return `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&scope=${scopes}&response_type=code&state=${state}`;
  }
}
