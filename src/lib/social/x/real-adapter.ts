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

const X_API = 'https://api.x.com/2';

export class XRealAdapter implements SocialPlatformAdapter {
  platform: SocialPlatform = 'x';

  private accessToken: string;

  constructor(accessToken?: string) {
    this.accessToken = accessToken ?? process.env.X_ACCESS_TOKEN ?? '';
  }

  private getAuthHeader(): string {
    return `Bearer ${this.accessToken}`;
  }

  async connectAccount(authorizationCode: string): Promise<ConnectResult> {
    log.info('x_connect', 'Intercambiando código por token de X');
    try {
      const basicAuth = Buffer.from(
        `${process.env.X_API_KEY}:${process.env.X_API_SECRET}`
      ).toString('base64');

      const res = await fetch('https://api.x.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: authorizationCode,
          redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/x/callback`,
          code_verifier: 'challenge', // PKCE verifier should be stored per session
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
      log.error('x_connect_error', String(error));
      return { success: false, error: String(error) };
    }
  }

  async refreshToken(refreshToken: string): Promise<TokenResult> {
    log.info('x_refresh', 'Refrescando token de X');
    try {
      const basicAuth = Buffer.from(
        `${process.env.X_API_KEY}:${process.env.X_API_SECRET}`
      ).toString('base64');

      const res = await fetch('https://api.x.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
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
    log.info('x_disconnect', 'Desconectando cuenta de X');
  }

  async getProfile(accessToken: string): Promise<ProfileResult> {
    log.info('x_profile', 'Obteniendo perfil de X');
    try {
      const res = await fetch(`${X_API}/users/me?user.fields=profile_image_url,public_metrics`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (data.errors) throw new Error(data.errors[0].message);
      const user = data.data;
      return {
        success: true,
        user_id: user.id,
        username: user.username,
        display_name: user.name,
        avatar_url: user.profile_image_url,
        followers: user.public_metrics?.followers_count ?? 0,
        permissions: ['tweet.read', 'tweet.write', 'users.read'],
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async validateContent(content: ContentValidationInput): Promise<ContentValidationResult> {
    log.info('x_validate', 'Validando contenido para X');
    const errors: string[] = [];
    const warnings: string[] = [];
    if (content.caption && content.caption.length > 280) {
      errors.push('El tweet supera el límite de 280 caracteres');
    }
    if (content.hashtags && content.hashtags.length > 10) {
      errors.push('No se pueden usar más de 10 hashtags en X');
    }
    if (content.media && content.media.length > 4) {
      errors.push('No se pueden adjuntar más de 4 archivos de media');
    }
    if (content.media) {
      for (const m of content.media) {
        if (m.type === 'video' && m.duration && m.duration > 140) {
          errors.push('Los videos no pueden superar los 2:20 minutos');
        }
      }
    }
    if (content.caption && content.caption.length > 240) {
      warnings.push('Tweets más cortos suelen tener mejor engagement');
    }
    return { valid: errors.length === 0, errors, warnings };
  }

  async uploadMedia(media: MediaUpload): Promise<MediaUploadResult> {
    log.info('x_upload', 'Subiendo media a X', { file_type: media.file_type });
    try {
      const fileBlob = await fetch(media.file_url).then((r) => r.blob());
      const formData = new FormData();
      formData.append('command', 'INIT');
      formData.append('total_bytes', String(fileBlob.size));
      formData.append('media_type', media.file_type);
      formData.append('media_category', media.file_type.startsWith('video') ? 'tweet_video' : 'tweet_image');

      const initRes = await fetch('https://upload.x.com/1.1/media/upload.json', {
        method: 'POST',
        headers: { Authorization: this.getAuthHeader() },
        body: formData,
      });
      const initData = await initRes.json();
      if (initData.errors) throw new Error(initData.errors[0].message);

      const appendData = new FormData();
      appendData.append('command', 'APPEND');
      appendData.append('media_id', initData.media_id_string);
      appendData.append('segment_index', '0');
      appendData.append('media_data', btoa(String.fromCharCode(...new Uint8Array(await fileBlob.arrayBuffer()))));

      const appendRes = await fetch('https://upload.x.com/1.1/media/upload.json', {
        method: 'POST',
        headers: { Authorization: this.getAuthHeader() },
        body: appendData,
      });
      if (!appendRes.ok) throw new Error('Error al subir el archivo');

      const finalData = new FormData();
      finalData.append('command', 'FINALIZE');
      finalData.append('media_id', initData.media_id_string);

      const finalRes = await fetch('https://upload.x.com/1.1/media/upload.json', {
        method: 'POST',
        headers: { Authorization: this.getAuthHeader() },
        body: finalData,
      });
      const finalResult = await finalRes.json();
      if (finalResult.errors) throw new Error(finalResult.errors[0].message);

      return {
        success: true,
        media_id: initData.media_id_string,
        media_url: media.file_url,
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async publishPost(post: PublishInput): Promise<PublishResult> {
    log.info('x_publish', 'Publicando en X', { caption_length: post.caption.length });
    try {
      const body: Record<string, unknown> = { text: post.caption };
      if (post.media_ids && post.media_ids.length > 0) {
        body.media = { media_ids: post.media_ids };
      }

      const res = await fetch(`${X_API}/tweets`, {
        method: 'POST',
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.errors) throw new Error(data.errors[0].message);

      return {
        success: true,
        platform_post_id: data.data?.id,
        platform_post_url: `https://x.com/i/status/${data.data?.id}`,
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async schedulePost(_post: ScheduleInput): Promise<ScheduleResult> {
    log.info('x_schedule', 'Programando en X');
    return {
      success: false,
      error: 'X no soporta programación directa. Usá el programador interno de la app.',
      manual_required: true,
    };
  }

  async getPostStatus(postId: string, accessToken: string): Promise<PostStatusResult> {
    log.info('x_status', 'Verificando estado del tweet', { post_id: postId });
    try {
      const res = await fetch(`${X_API}/tweets/${postId}?tweet.fields=created_at`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (data.errors) throw new Error(data.errors[0].message);
      return {
        success: true,
        status: data.data ? 'PUBLISHED' : 'UNKNOWN',
        post_url: `https://x.com/i/status/${postId}`,
      };
    } catch (error) {
      return { success: false, status: 'UNKNOWN', error: String(error) };
    }
  }

  async deletePost(postId: string, accessToken: string): Promise<void> {
    log.info('x_delete', 'Eliminando tweet', { post_id: postId });
    await fetch(`${X_API}/tweets/${postId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async getAnalytics(accountId: string, dateRange: DateRange): Promise<AnalyticsResult> {
    log.info('x_analytics', 'Obteniendo analíticas de X');
    try {
      const res = await fetch(
        `${X_API}/users/${accountId}/tweets?tweet.fields=public_metrics,created_at&max_results=100&start_time=${dateRange.start}T00:00:00Z&end_time=${dateRange.end}T23:59:59Z`,
        { headers: { Authorization: this.getAuthHeader() } }
      );
      const data = await res.json();
      if (data.errors) throw new Error(data.errors[0].message);

      let totalImpressions = 0;
      let totalLikes = 0;
      let totalRetweets = 0;
      let totalReplies = 0;
      let totalQuotes = 0;

      if (data.data) {
        for (const tweet of data.data) {
          const metrics = tweet.public_metrics;
          totalImpressions += metrics?.impression_count ?? 0;
          totalLikes += metrics?.like_count ?? 0;
          totalRetweets += metrics?.retweet_count ?? 0;
          totalReplies += metrics?.reply_count ?? 0;
          totalQuotes += metrics?.quote_count ?? 0;
        }
      }

      const result: PostMetrics = {
        impressions: totalImpressions,
        likes: totalLikes,
        comments: totalReplies,
        shares: totalRetweets + totalQuotes,
      };

      return { success: true, metrics: result };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  getLimits(): PlatformLimits {
    return {
      max_caption_length: 280,
      max_hashtags: 10,
      max_mentions: 10,
      max_media: 4,
      supported_media_types: ['image', 'video', 'gif'],
      max_video_duration: 140,
      max_video_size: 536870912,
      max_image_size: 5242880,
    };
  }

  getAuthUrl(state: string): string {
    const clientId = process.env.X_CLIENT_ID ?? '';
    const scopes = 'tweet.read,tweet.write,users.read,offline.access';
    return `https://twitter.com/i/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(process.env.X_REDIRECT_URI ?? '')}&scope=${scopes}&response_type=code&state=${state}`;
  }
}
