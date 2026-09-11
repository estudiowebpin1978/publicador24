import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const secret = process.env.TOKEN_ENCRYPTION_KEY;
  if (!secret) throw new Error('TOKEN_ENCRYPTION_KEY environment variable is required');
  const salt = process.env.TOKEN_ENCRYPTION_SALT || 'autopublicador-default-salt';
  return scryptSync(secret, salt, 32);
}

export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptToken(ciphertext: string): string {
  const key = getEncryptionKey();
  const parts = ciphertext.split(':');
  if (parts.length !== 3) throw new Error('Invalid ciphertext format');

  const iv = Buffer.from(parts[0], 'base64');
  const authTag = Buffer.from(parts[1], 'base64');
  const encrypted = Buffer.from(parts[2], 'base64');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

export function isTokenExpired(expiresAt: string): boolean {
  return new Date(expiresAt) <= new Date();
}

export function getTokenExpiry(expiresAt: string): { expired: boolean; remainingMs: number; remainingMinutes: number } {
  const now = Date.now();
  const expiry = new Date(expiresAt).getTime();
  const remainingMs = expiry - now;

  return {
    expired: remainingMs <= 0,
    remainingMs: Math.max(0, remainingMs),
    remainingMinutes: Math.max(0, Math.floor(remainingMs / 60000)),
  };
}

export function isTokenExpiringSoon(expiresAt: string, thresholdMinutes: number = 30): boolean {
  const { remainingMinutes } = getTokenExpiry(expiresAt);
  return remainingMinutes <= thresholdMinutes && remainingMinutes > 0;
}

export function maskToken(token: string): string {
  if (token.length <= 8) return '****';
  return `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
}

export interface TokenData {
  encrypted_access_token: string;
  encrypted_refresh_token?: string;
  token_type: string;
  expires_at: string;
  scopes: string[];
}

export function encryptTokenData(data: {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}): TokenData {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + data.expires_in * 1000);

  return {
    encrypted_access_token: encryptToken(data.access_token),
    encrypted_refresh_token: data.refresh_token ? encryptToken(data.refresh_token) : undefined,
    token_type: data.token_type,
    expires_at: expiresAt.toISOString(),
    scopes: data.scope ? data.scope.split(' ') : [],
  };
}

export function decryptTokenData(tokenData: TokenData): {
  access_token: string;
  refresh_token?: string;
} {
  const result: { access_token: string; refresh_token?: string } = {
    access_token: decryptToken(tokenData.encrypted_access_token),
  };

  if (tokenData.encrypted_refresh_token) {
    result.refresh_token = decryptToken(tokenData.encrypted_refresh_token);
  }

  return result;
}

export function sanitizeTokenResponse<T extends Record<string, unknown>>(response: T): T {
  const sanitized = { ...response };
  const sensitiveKeys = [
    'access_token', 'refresh_token', 'client_secret',
    'service_role', 'secret', 'private_key',
  ];

  for (const key of sensitiveKeys) {
    if (key in sanitized) {
      delete sanitized[key];
    }
  }

  return sanitized;
}
