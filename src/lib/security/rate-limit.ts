import type { SocialPlatform, RateLimitState } from '@/types';
import { PLATFORMS } from '@/lib/config/platforms';

interface RateLimitEntry {
  state: RateLimitState;
  remaining: number;
  limit: number;
  reset_at: string;
  retry_after?: number;
  updated_at: string;
}

interface RateLimitKey {
  social_account_id: string;
  platform: SocialPlatform;
  endpoint: string;
}

export class RateLimitManager {
  private store: Map<string, RateLimitEntry> = new Map();

  private makeKey(key: RateLimitKey): string {
    return `${key.social_account_id}:${key.platform}:${key.endpoint}`;
  }

  private getState(remaining: number, limit: number): RateLimitState {
    const ratio = remaining / limit;
    if (remaining <= 0) return 'BLOCKED';
    if (ratio <= 0.1) return 'THROTTLED';
    if (ratio <= 0.3) return 'WARNING';
    return 'AVAILABLE';
  }

  async getLimit(key: RateLimitKey): Promise<RateLimitEntry | null> {
    const mapKey = this.makeKey(key);
    const cached = this.store.get(mapKey);
    if (cached && new Date(cached.reset_at) > new Date()) {
      return cached;
    }
    this.store.delete(mapKey);
    return null;
  }

  async updateLimit(
    key: RateLimitKey,
    remaining: number,
    limit: number,
    resetAt: string,
    retryAfter?: number
  ): Promise<RateLimitEntry> {
    const entry: RateLimitEntry = {
      state: this.getState(remaining, limit),
      remaining,
      limit,
      reset_at: resetAt,
      retry_after: retryAfter,
      updated_at: new Date().toISOString(),
    };
    this.store.set(this.makeKey(key), entry);
    return entry;
  }

  async recordRequest(key: RateLimitKey): Promise<RateLimitEntry> {
    const existing = await this.getLimit(key);
    if (existing) {
      return this.updateLimit(
        key,
        Math.max(0, existing.remaining - 1),
        existing.limit,
        existing.reset_at
      );
    }
    const platformConfig = PLATFORMS[key.platform];
    const limit = platformConfig?.rateLimits.apiCallsPerMinute || 60;
    return this.updateLimit(key, limit - 1, limit, this.getResetTime(60));
  }

  async handleRetryAfter(key: RateLimitKey, retryAfterSeconds: number): Promise<void> {
    const resetAt = new Date(Date.now() + retryAfterSeconds * 1000).toISOString();
    this.store.set(this.makeKey(key), {
      state: 'BLOCKED',
      remaining: 0,
      limit: 0,
      reset_at: resetAt,
      retry_after: retryAfterSeconds,
      updated_at: new Date().toISOString(),
    });
  }

  async canPublish(socialAccountId: string, platform: SocialPlatform): Promise<{
    allowed: boolean;
    state: RateLimitState;
    remaining: number;
    reset_at: string;
    retry_after?: number;
  }> {
    const key: RateLimitKey = {
      social_account_id: socialAccountId,
      platform,
      endpoint: 'publish',
    };

    const existing = await this.getLimit(key);
    if (existing) {
      return {
        allowed: existing.state === 'AVAILABLE' || existing.state === 'WARNING',
        state: existing.state,
        remaining: existing.remaining,
        reset_at: existing.reset_at,
        retry_after: existing.retry_after,
      };
    }

    const platformConfig = PLATFORMS[platform];
    const dailyLimit = platformConfig?.rateLimits.postsPerDay || 10;

    return {
      allowed: true,
      state: 'AVAILABLE',
      remaining: dailyLimit,
      reset_at: this.getResetTime(86400),
    };
  }

  async getRemainingQuota(
    socialAccountId: string,
    platform: SocialPlatform,
    endpoint: string = 'publish'
  ): Promise<{
    remaining: number;
    limit: number;
    reset_at: string;
    state: RateLimitState;
  }> {
    const key: RateLimitKey = {
      social_account_id: socialAccountId,
      platform,
      endpoint,
    };

    const existing = await this.getLimit(key);
    if (existing) {
      return {
        remaining: existing.remaining,
        limit: existing.limit,
        reset_at: existing.reset_at,
        state: existing.state,
      };
    }

    const platformConfig = PLATFORMS[platform];
    const defaultLimit = endpoint === 'publish'
      ? platformConfig?.rateLimits.postsPerDay || 10
      : platformConfig?.rateLimits.apiCallsPerMinute || 60;

    return {
      remaining: defaultLimit,
      limit: defaultLimit,
      reset_at: this.getResetTime(endpoint === 'publish' ? 86400 : 60),
      state: 'AVAILABLE',
    };
  }

  async getAccountLimits(socialAccountId: string, platform: SocialPlatform): Promise<RateLimitEntry[]> {
    const prefix = `${socialAccountId}:${platform}:`;
    const results: RateLimitEntry[] = [];
    for (const [key, value] of this.store.entries()) {
      if (key.startsWith(prefix)) {
        if (new Date(value.reset_at) > new Date()) {
          results.push(value);
        }
      }
    }
    return results;
  }

  async clearExpired(): Promise<number> {
    let cleared = 0;
    const now = new Date();
    for (const [key, value] of this.store.entries()) {
      if (new Date(value.reset_at) <= now) {
        this.store.delete(key);
        cleared++;
      }
    }
    return cleared;
  }

  async getStats(): Promise<{
    total: number;
    blocked: number;
    throttled: number;
    warning: number;
    available: number;
  }> {
    let blocked = 0;
    let throttled = 0;
    let warning = 0;
    let available = 0;
    const now = new Date();

    for (const entry of this.store.values()) {
      if (new Date(entry.reset_at) <= now) continue;
      switch (entry.state) {
        case 'BLOCKED': blocked++; break;
        case 'THROTTLED': throttled++; break;
        case 'WARNING': warning++; break;
        case 'AVAILABLE': available++; break;
      }
    }

    return {
      total: blocked + throttled + warning + available,
      blocked,
      throttled,
      warning,
      available,
    };
  }

  private getResetTime(secondsFromNow: number): string {
    return new Date(Date.now() + secondsFromNow * 1000).toISOString();
  }
}

export const rateLimitManager = new RateLimitManager();
