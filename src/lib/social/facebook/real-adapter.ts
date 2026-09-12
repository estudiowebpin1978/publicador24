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

export class FacebookRealAdapter implements SocialPlatformAdapter {
  platform: SocialPlatform = 'facebook';

  private accessToken: string;
  private pageId: string;

  constructor(accessToken?: string, pageId?: string) {
    this.accessToken = accessToken ?? process.env.FACEBOOK_ACCESS_TOKEN ?? '';
    this.pageId = pageId ?? process.env.FACEBOOK_PAGE_ID ?? '';
  }

  async connectAccount(authorizationCode: string): Promise<ConnectResult> {
    log.info('facebook_connect', 'Intercambiando código por token de Facebook');
    try {
      const tokenRes = await fetch(`${FB_API}/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: process.env.FACEBOOK_APP_ID,
          client_secret: process.env.FACEBOOK_APP_SECRET,
          redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/facebook/callback`,
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
        `${FB_API}/me/accounts?fields=id,name,access_token&access_token=${longLivedData.access_token ?? tokenData.access_token}`
      );
      const pageData = await pageRes.json();
      const page = pageData.data?.[0];

      return {
        success: true,
        account_id: page?.id ?? '',
        access_token: page?.access_token ?? longLivedData.access_token ?? tokenData.access_token,
        expires_at: longLivedData.expires_in
          ? new Date(Date.now() + longLivedData.expires_in * 1000).toISOString()
          : undefined,
        scopes: ['pages_manage_posts', 'pages_read_engagement', 'pages_show_list'],
      };
    } catch (error) {
      log.error('facebook_connect_error', String(error));
      return { success: false, error: String(error) };
    }
  }

  async refreshToken(refreshToken: string): Promise<TokenResult> {
    log.info('facebook_refresh', 'Refrescando token de Facebook');
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
    log.info('facebook_disconnect', 'Desconectando cuenta de Facebook');
  }

  async getProfile(accessToken: string): Promise<ProfileResult> {
    log.info('facebook_profile', 'Obteniendo perfil de Facebook');
    try {
      const pageId = this.pageId || this.extractPageId(accessToken);
      const res = await fetch(
        `${FB_API}/${pageId}?fields=name,fan_count,picture&access_token=${accessToken}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      return {
        success: true,
        user_id: pageId,
        username: data.name,
        display_name: data.name,
        avatar_url: data.picture?.data?.url ?? '',
        followers: data.fan_count ?? 0,
        permissions: ['pages_manage_posts', 'pages_read_engagement'],
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async validateContent(content: ContentValidationInput): Promise<ContentValidationResult> {
    log.info('facebook_validate', 'Validando contenido para Facebook');
    const errors: string[] = [];
    const warnings: string[] = [];
    if (content.caption && content.caption.length > 63206) {
      errors.push('El texto supera el límite de 63.206 caracteres');
    }
    if (content.hashtags && content.hashtags.length > 10) {
      errors.push('No se pueden usar más de 10 hashtags');
    }
    if (content.media && content.media.length > 10) {
      errors.push('No se pueden subir más de 10 archivos de media');
    }
    if (content.media) {
      for (const m of content.media) {
        if (m.type === 'video' && m.duration && m.duration > 14400) {
          errors.push('Los videos no pueden superar las 4 horas');
        }
      }
    }
    return { valid: errors.length === 0, errors, warnings };
  }

  async uploadMedia(media: MediaUpload): Promise<MediaUploadResult> {
    log.info('facebook_upload', 'Subiendo media a Facebook', { file_type: media.file_type });
    try {
      const isVideo = media.file_type.startsWith('video');
      const endpoint = isVideo ? 'videos' : 'photos';
      const body: Record<string, string> = { access_token: media.access_token };
      if (isVideo) {
        body.file_url = media.file_url;
      } else {
        body.url = media.file_url;
      }
      if (media.caption) body.caption = media.caption;

      const res = await fetch(`${FB_API}/${this.pageId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      return {
        success: true,
        media_id: data.id ?? data.post_id ?? '',
        media_url: media.file_url,
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async publishPost(post: PublishInput): Promise<PublishResult> {
    log.info('facebook_publish', 'Publicando en Facebook', { caption_length: post.caption.length });
    try {
      const res = await fetch(`${FB_API}/${this.pageId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: post.caption,
          access_token: post.access_token,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      return {
        success: true,
        platform_post_id: data.id,
        platform_post_url: `https://facebook.com/${data.id}`,
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async schedulePost(post: ScheduleInput): Promise<ScheduleResult> {
    log.info('facebook_schedule', 'Programando en Facebook');
    try {
      const scheduledTime = Math.floor(new Date(post.scheduled_at).getTime() / 1000);
      const res = await fetch(`${FB_API}/${this.pageId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: post.caption,
          scheduled_publish_time: scheduledTime,
          published: false,
          access_token: post.access_token,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      return {
        success: true,
        schedule_id: data.id,
        scheduled_at: post.scheduled_at,
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
        manual_required: true,
      };
    }
  }

  async getPostStatus(postId: string, accessToken: string): Promise<PostStatusResult> {
    log.info('facebook_status', 'Verificando estado del post', { post_id: postId });
    try {
      const res = await fetch(
        `${FB_API}/${postId}?fields=status&access_token=${accessToken}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      return {
        success: true,
        status: data.status === 'published' ? 'PUBLISHED' : 'PROCESSING',
        post_url: `https://facebook.com/${postId}`,
      };
    } catch (error) {
      return { success: false, status: 'UNKNOWN', error: String(error) };
    }
  }

  async deletePost(postId: string, accessToken: string): Promise<void> {
    log.info('facebook_delete', 'Eliminando post de Facebook', { post_id: postId });
    await fetch(`${FB_API}/${postId}?access_token=${accessToken}`, { method: 'DELETE' });
  }

  async getAnalytics(accountId: string, dateRange: DateRange): Promise<AnalyticsResult> {
    log.info('facebook_analytics', 'Obteniendo analíticas de Facebook');
    try {
      const metrics = 'page_impressions,page_reactions,page_post_engagements,page_fan_count';
      const res = await fetch(
        `${FB_API}/${accountId}/insights/${metrics}?period=day&since=${dateRange.start}&until=${dateRange.end}&access_token=${this.accessToken}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      const result: PostMetrics = {
        impressions: data.data?.[0]?.values?.[0]?.value ?? 0,
        likes: data.data?.[1]?.values?.[0]?.value ?? 0,
        engagement_rate: data.data?.[2]?.values?.[0]?.value ?? 0,
        followers_gained: data.data?.[3]?.values?.[0]?.value ?? 0,
      };

      return { success: true, metrics: result };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  getLimits(): PlatformLimits {
    return {
      max_caption_length: 63206,
      max_hashtags: 10,
      max_mentions: 10,
      max_media: 10,
      supported_media_types: ['image', 'video', 'carousel'],
      max_video_duration: 14400,
      max_video_size: 10737418240,
      max_image_size: 31457280,
    };
  }

  getAuthUrl(state: string): string {
    const appId = process.env.FACEBOOK_APP_ID ?? '';
    const scopes = 'pages_manage_posts,pages_read_engagement,pages_show_list';
    return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(process.env.FACEBOOK_REDIRECT_URI ?? '')}&scope=${scopes}&state=${state}`;
  }

  private extractPageId(_token: string): string {
    return this.pageId || '';
  }
}
