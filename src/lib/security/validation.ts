import { z } from 'zod';
import { createHmac } from 'crypto';

const SocialPlatformSchema = z.enum(['tiktok', 'instagram', 'facebook', 'x', 'youtube', 'linkedin']);
const ContentTypeSchema = z.enum(['text', 'image', 'video', 'carousel', 'link', 'mixed']);
const AutopilotLevelSchema = z.enum(['MANUAL', 'ASSISTED', 'AUTO', 'SAFE_AUTO']);

export const ContentInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  content_type: ContentTypeSchema,
  target_platforms: z.array(SocialPlatformSchema).min(1).max(6),
  language: z.string().min(2).max(5),
  caption: z.string().max(10000).optional(),
  hashtags: z.array(z.string().max(100)).max(30).optional(),
  mentions: z.array(z.string().max(100)).max(20).optional(),
  cta: z.string().max(500).optional(),
  media_ids: z.array(z.string().uuid()).max(10).optional(),
  scheduled_at: z.string().datetime().optional(),
  workspace_id: z.string().uuid(),
});

export const PublishInputSchema = z.object({
  content_id: z.string().uuid(),
  social_account_id: z.string().uuid(),
  platform: SocialPlatformSchema,
  variant_id: z.string().uuid().optional(),
  platform_variant_id: z.string().uuid().optional(),
  scheduled_at: z.string().datetime().optional(),
  idempotency_key: z.string().uuid(),
});

export const WorkspaceSettingsSchema = z.object({
  timezone: z.string().max(50).optional(),
  default_language: z.string().min(2).max(5).optional(),
  default_country: z.string().min(2).max(3).optional(),
  niche: z.string().max(100).optional(),
  autopilot_level: AutopilotLevelSchema.optional(),
  posting_frequency: z.record(SocialPlatformSchema, z.number().min(0).max(100)).optional(),
  hashtag_strategy: z.object({
    high_reach_percent: z.number().min(0).max(100),
    medium_percent: z.number().min(0).max(100),
    niche_percent: z.number().min(0).max(100),
  }).optional(),
});

export const SocialAccountInputSchema = z.object({
  platform: SocialPlatformSchema,
  access_token: z.string().min(1),
  refresh_token: z.string().optional(),
  token_type: z.string().default('bearer'),
  expires_in: z.number().positive(),
  scope: z.string().optional(),
  platform_user_id: z.string().min(1),
  username: z.string().min(1).max(100),
  display_name: z.string().max(100).optional(),
});

export const CampaignInputSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  objective: z.string().max(500).optional(),
  target_audience: z.string().max(500).optional(),
  platforms: z.array(SocialPlatformSchema).min(1).max(6),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  budget: z.number().min(0).optional(),
  workspace_id: z.string().uuid(),
});

export const QueryParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  sort_by: z.string().max(50).optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().max(200).optional(),
  platform: SocialPlatformSchema.optional(),
  status: z.string().max(50).optional(),
});

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: true;
  data: T;
} | {
  success: false;
  errors: z.ZodIssue[];
} {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error.issues };
}

const HTML_TAG_REGEX = /<[^>]*>/g;
const SCRIPT_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const EVENT_HANDLER_REGEX = /\son\w+\s*=\s*["'][^"']*["']/gi;
const DANGEROUS_ATTRS = /javascript:/gi;

export function sanitizeHtml(input: string): string {
  return input
    .replace(SCRIPT_REGEX, '')
    .replace(EVENT_HANDLER_REGEX, '')
    .replace(DANGEROUS_ATTRS, '')
    .replace(HTML_TAG_REGEX, '')
    .trim();
}

export function sanitizeText(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 10000);
}

export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol');
    }
    return parsed.toString();
  } catch {
    throw new Error('Invalid URL');
  }
}

const CSRF_SECRET = process.env.CSRF_SECRET || 'autopublicador-csrf';

export function generateCsrfToken(sessionId: string): string {
  const timestamp = Date.now();
  const payload = `${sessionId}:${timestamp}`;
  const signature = createHmac('sha256', CSRF_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64');
}

export function validateCsrfToken(token: string, sessionId: string, maxAgeMs: number = 3600000): boolean {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length !== 3) return false;

    const [tokenSessionId, timestampStr, signature] = parts;
    if (tokenSessionId !== sessionId) return false;

    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) return false;
    if (Date.now() - timestamp > maxAgeMs) return false;

    const expectedSignature = createHmac('sha256', CSRF_SECRET)
      .update(`${tokenSessionId}:${timestampStr}`)
      .digest('hex');

    return signature === expectedSignature;
  } catch {
    return false;
  }
}

export type { z };
