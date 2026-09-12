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

const FB_API = 'https://graph.facebook.com/v19.0';

export class InstagramRealAdapter implements SocialPlatformAdapter {
  platform: SocialPlatform = 'instagram';

  private accessToken: string;
  private accountId: string;

  constructor(accessToken?: string, accountId?: string) {
    this.accessToken = accessToken ?? process.env.INSTAGRAM_ACCESS_TOKEN ?? '';
    this.accountId = accountId ?? process.env.INSTAGRAM_ACCOUNT_ID ?? '';
  }

  async connectAccount(authorizationCode: string): Promise<ConnectResult> {
    log.info('instagram_connect', 'Intercambiando código por token de Instagram');
    try {
      const tokenRes = await fetch(`${FB_API}/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: process.env.FACEBOOK_APP_ID,
          client_secret: process.env.FACEBOOK_APP_SECRET,
          redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/instagram/callback`,
          code: authorizationCode,
        }),
      });
      const tokenData = await tokenRes.json();
      if (tokenData.error) throw new Error(tokenData.error.message);

      const longLivedRes = await fetch(
        `${FB_API}/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.FACEBOOK_APP_ID}&client_secret=${process.env.FACEBOOK_APP_SECRET}&fb_exchange_token=${tokenData.access_token}`
      );
      const longLivedData = await longLivedRes.json();

      const pageRes = await fetch(
        `${FB_API}/me/accounts?fields=id,instagram_business_account&access_token=${tokenData.access_token}`
      );
      const pageData = await pageRes.json();
      const igAccount = pageData.data?.[0]?.instagram_business_account;

      return {
        success: true,
        account_id: igAccount?.id ?? '',
        access_token: longLivedData.access_token ?? tokenData.access_token,
        expires_at: new Date(Date.now() + (longLivedData.expires_in ?? 60 * 24 * 60) * 1000).toISOString(),
        scopes: ['instagram_basic', 'instagram_content_publish', 'instagram_manage_insights'],
      };
    } catch (error) {
      log.error('instagram_connect_error', String(error));
      return { success: false, error: String(error) };
    }
  }

  async refreshToken(refreshToken: string): Promise<TokenResult> {
    log.info('instagram_refresh', 'Refrescando token de Instagram');
    try {
      const res = await fetch(
        `${FB_API}/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.FACEBOOK_APP_ID}&client_secret=${process.env.FACEBOOK_APP_SECRET}&fb_exchange_token=${refreshToken}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      return {
        success: true,
        access_token: data.access_token,
        expires_at: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(),
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async disconnectAccount(_accountId: string): Promise<void> {
    log.info('instagram_disconnect', 'Desconectando cuenta de Instagram');
  }

  async getProfile(accessToken: string): Promise<ProfileResult> {
    log.info('instagram_profile', 'Obteniendo perfil de Instagram');
    try {
      const accountId = this.accountId || this.extractAccountId(accessToken);
      const res = await fetch(
        `${FB_API}/${accountId}?fields=username,name,followers_count,media_count,profile_picture_url&access_token=${accessToken}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      return {
        success: true,
        user_id: accountId,
        username: data.username,
        display_name: data.name,
        avatar_url: data.profile_picture_url,
        followers: data.followers_count,
        permissions: ['instagram_basic', 'instagram_content_publish'],
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async validateContent(content: ContentValidationInput): Promise<ContentValidationResult> {
    log.info('instagram_validate', 'Validando contenido para Instagram');
    const errors: string[] = [];
    const warnings: string[] = [];
    if (content.caption && content.caption.length > 2200) {
      errors.push('El texto supera el límite de 2200 caracteres');
    }
    if (content.hashtags && content.hashtags.length > 30) {
      errors.push('No se pueden usar más de 30 hashtags');
    }
    if (content.media && content.media.length > 10) {
      errors.push('No se pueden subir más de 10 elementos de media');
    }
    if (content.media) {
      for (const m of content.media) {
        if (m.type === 'video' && m.duration && m.duration > 90) {
          errors.push('Los reels no pueden superar los 90 segundos');
        }
      }
    }
    if (content.hashtags && content.hashtags.length > 20) {
      warnings.push('Se recomiendan menos de 20 hashtags para mejor engagement');
    }
    return { valid: errors.length === 0, errors, warnings };
  }

  async uploadMedia(media: MediaUpload): Promise<MediaUploadResult> {
    log.info('instagram_upload', 'Subiendo media a Instagram', { file_type: media.file_type });
    try {
      const isVideo = media.file_type.startsWith('video');
      const body: Record<string, string> = {
        caption: media.caption ?? '',
        access_token: media.access_token,
      };
      if (isVideo) {
        body.media_type = 'VIDEO';
        body.video_url = media.file_url;
      } else {
        body.image_url = media.file_url;
      }

      const res = await fetch(`${FB_API}/${this.accountId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      return {
        success: true,
        media_id: data.id,
        media_url: media.file_url,
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async publishPost(post: PublishInput): Promise<PublishResult> {
    log.info('instagram_publish', 'Publicando en Instagram', { caption_length: post.caption.length });
    try {
      const containerBody: Record<string, string> = {
        access_token: post.access_token,
      };

      if (post.media_ids && post.media_ids.length > 1) {
        containerBody.media_type = 'CAROUSEL';
        containerBody.children = post.media_ids.join(',');
        containerBody.caption = post.caption;
      } else if (post.media_ids && post.media_ids.length === 1) {
        containerBody.caption = post.caption;
        containerBody.image_url = '';
      } else {
        containerBody.caption = post.caption;
      }

      const containerRes = await fetch(`${FB_API}/${this.accountId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(containerBody),
      });
      const container = await containerRes.json();
      if (container.error) throw new Error(container.error.message);

      const publishRes = await fetch(`${FB_API}/${this.accountId}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: container.id,
          access_token: post.access_token,
        }),
      });
      const publish = await publishRes.json();
      if (publish.error) throw new Error(publish.error.message);

      return {
        success: true,
        platform_post_id: publish.id,
        platform_post_url: `https://www.instagram.com/p/${publish.id}`,
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async schedulePost(post: ScheduleInput): Promise<ScheduleResult> {
    log.info('instagram_schedule', 'Programando publicación en Instagram');
    return {
      success: false,
      error: 'Instagram no soporta programación directa. Usá el programador interno de la app.',
      manual_required: true,
    };
  }

  async getPostStatus(postId: string, accessToken: string): Promise<PostStatusResult> {
    log.info('instagram_status', 'Verificando estado del post', { post_id: postId });
    try {
      const res = await fetch(
        `${FB_API}/${postId}?fields=status_code&access_token=${accessToken}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const status = data.status_code === 'PUBLISHED' ? 'PUBLISHED' : 'PROCESSING';
      return {
        success: true,
        status,
        post_url: `https://www.instagram.com/p/${postId}`,
      };
    } catch (error) {
      return { success: false, status: 'UNKNOWN', error: String(error) };
    }
  }

  async deletePost(postId: string, accessToken: string): Promise<void> {
    log.info('instagram_delete', 'Eliminando post de Instagram', { post_id: postId });
    await fetch(`${FB_API}/${postId}?access_token=${accessToken}`, { method: 'DELETE' });
  }

  async getAnalytics(accountId: string, dateRange: DateRange): Promise<AnalyticsResult> {
    log.info('instagram_analytics', 'Obteniendo analíticas de Instagram');
    try {
      const metrics = 'impressions,reach,engagement,profile_views';
      const res = await fetch(
        `${FB_API}/${accountId}/insights?metric=${metrics}&period=day&since=${dateRange.start}&until=${dateRange.end}&access_token=${this.accessToken}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      const result: PostMetrics = {
        impressions: data.data?.[0]?.values?.[0]?.value ?? 0,
        reach: data.data?.[1]?.values?.[0]?.value ?? 0,
        engagement_rate: data.data?.[2]?.values?.[0]?.value ?? 0,
        clicks: data.data?.[3]?.values?.[0]?.value ?? 0,
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
      max_mentions: 20,
      max_media: 10,
      supported_media_types: ['image', 'video', 'carousel'],
      max_video_duration: 90,
      max_image_size: 31457280,
    };
  }

  getAuthUrl(state: string): string {
    const appId = process.env.FACEBOOK_APP_ID ?? '';
    const scopes = 'instagram_basic,instagram_content_publish,instagram_manage_insights';
    return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(process.env.INSTAGRAM_REDIRECT_URI ?? '')}&scope=${scopes}&state=${state}`;
  }

  private extractAccountId(token: string): string {
    return this.accountId || '';
  }
}
