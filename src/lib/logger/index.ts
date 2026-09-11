import type { SocialPlatform } from '@/types';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  event: string;
  message: string;
  metadata?: Record<string, unknown>;
  request_id?: string;
  job_id?: string;
  workspace_id?: string;
  account_id?: string;
  content_id?: string;
}

interface LogContext {
  request_id?: string;
  job_id?: string;
  workspace_id?: string;
  account_id?: string;
  content_id?: string;
}

const SENSITIVE_FIELDS = new Set([
  'access_token',
  'refresh_token',
  'client_secret',
  'service_role',
  'password',
  'secret',
  'token',
  'authorization',
  'cookie',
  'api_key',
  'apikey',
  'private_key',
  'credentials',
]);

const MASKED = '[REDACTED]';

function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    if (value.length > 20 && /^[A-Za-z0-9+/=_-]{20,}$/.test(value)) {
      return MASKED;
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (typeof value === 'object') return sanitizeObject(value as Record<string, unknown>);
  return value;
}

function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
      sanitized[key] = MASKED;
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeValue(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function formatEntry(entry: LogEntry): string {
  return JSON.stringify(entry);
}

function writeLog(entry: LogEntry): void {
  const sanitized = {
    ...entry,
    metadata: entry.metadata ? sanitizeObject(entry.metadata) : undefined,
  };
  const output = formatEntry(sanitized);

  switch (entry.level) {
    case 'error':
      console.error(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    case 'debug':
      console.debug(output);
      break;
    default:
      console.log(output);
  }
}

class Logger {
  private context: LogContext;

  constructor(context: LogContext = {}) {
    this.context = context;
  }

  child(context: LogContext): Logger {
    return new Logger({ ...this.context, ...context });
  }

  private log(level: LogLevel, event: string, message: string, metadata?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      message,
      metadata,
      request_id: this.context.request_id,
      job_id: this.context.job_id,
      workspace_id: this.context.workspace_id,
      account_id: this.context.account_id,
      content_id: this.context.content_id,
    };
    writeLog(entry);
  }

  debug(event: string, message: string, metadata?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'production') return;
    this.log('debug', event, message, metadata);
  }

  info(event: string, message: string, metadata?: Record<string, unknown>): void {
    this.log('info', event, message, metadata);
  }

  warn(event: string, message: string, metadata?: Record<string, unknown>): void {
    this.log('warn', event, message, metadata);
  }

  error(event: string, message: string, metadata?: Record<string, unknown>): void {
    this.log('error', event, message, metadata);
  }

  publishAttempt(platform: SocialPlatform, accountId: string, contentId: string): Logger {
    return this.child({ account_id: accountId, content_id: contentId });
  }

  jobRun(jobId: string, workspaceId?: string): Logger {
    return this.child({ job_id: jobId, workspace_id: workspaceId });
  }
}

export const logger = new Logger();

export function createLogger(context: LogContext): Logger {
  return new Logger(context);
}

export type { LogEntry, LogContext, LogLevel };
