# Deployment Guide

Complete guide for deploying Auto Publisher to production.

## Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Deployment Architecture                │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │                  Vercel                           │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐      │  │
│  │  │  Next.js  │  │  Edge    │  │  Cron    │      │  │
│  │  │  App      │  │ Functions│  │  Jobs    │      │  │
│  │  └─────┬────┘  └─────┬────┘  └─────┬────┘      │  │
│  │        └──────────────┴─────────────┘            │  │
│  └────────────────────────┬─────────────────────────┘  │
│                           │                            │
│  ┌────────────────────────▼─────────────────────────┐  │
│  │                  Supabase                         │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐      │  │
│  │  │PostgreSQL│  │   Auth   │  │  Storage  │      │  │
│  │  │ Database │  │ Service  │  │          │      │  │
│  │  └──────────┘  └──────────┘  └──────────┘      │  │
│  └──────────────────────────────────────────────────┘  │
│                           │                            │
│  ┌────────────────────────▼─────────────────────────┐  │
│  │                External APIs                       │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐      │  │
│  │  │ OpenAI   │  │ Social   │  │  Other   │      │  │
│  │  │ API      │  │ Platform │  │  APIs    │      │  │
│  │  └──────────┘  └──────────┘  └──────────┘      │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Prerequisites

- Vercel account (free tier works)
- Supabase project (production)
- OpenAI API key
- Social platform OAuth credentials
- Custom domain (optional)

## Vercel Deployment

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-org/autopublicador.git
git push -u origin main
```

### 2. Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Configure project settings:
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: `npm run build`
   - Output Directory: `.next`

### 3. Configure Environment Variables

Add all environment variables in Vercel dashboard:

#### Required Variables
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
APP_URL
```

#### AI Variables
```
AI_API_KEY
AI_MODEL=gpt-4o-mini
AI_MAX_TOKENS=2000
AI_TEMPERATURE=0.7
```

#### Social Platform Variables
```
TIKTOK_CLIENT_KEY
TIKTOK_CLIENT_SECRET
META_APP_ID
META_APP_SECRET
X_CLIENT_ID
X_CLIENT_SECRET
YOUTUBE_CLIENT_ID
YOUTUBE_CLIENT_SECRET
LINKEDIN_CLIENT_ID
LINKEDIN_CLIENT_SECRET
```

#### Production Settings
```
SOCIAL_MOCK_MODE=false
CRON_SECRET=<generate-random-secret>
```

### 4. Deploy

Click "Deploy" and wait for build to complete.

### 5. Post-Deployment

1. **Update APP_URL**
   ```
   APP_URL=https://your-domain.vercel.app
   ```

2. **Update OAuth Redirect URIs**
   Update all platform OAuth settings with production URLs:
   ```
   https://your-domain.vercel.app/api/auth/callback/tiktok
   https://your-domain.vercel.app/api/auth/callback/meta
   https://your-domain.vercel.app/api/auth/callback/x
   https://your-domain.vercel.app/api/auth/callback/youtube
   https://your-domain.vercel.app/api/auth/callback/linkedin
   ```

3. **Set SOCIAL_MOCK_MODE=false**
   Disable mock mode for production.

## Supabase Production Setup

### 1. Create Production Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project for production
3. Choose a region close to your users
4. Note your project URL and keys

### 2. Run Database Migration

1. Go to SQL Editor in Supabase dashboard
2. Copy contents of `src/supabase/migrations/001_initial_schema.sql`
3. Execute the migration

### 3. Configure Auth Settings

1. Go to Authentication > Providers
2. Enable Email/Password
3. Optionally enable social providers

### 4. Get API Keys

1. Go to Settings > API
2. Copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key

### 5. Set Up Storage (Optional)

If using media uploads:

1. Go to Storage
2. Create bucket: `media`
3. Set bucket policies for authenticated access

## Domain Configuration

### Custom Domain

1. Go to Vercel project settings
2. Add your custom domain
3. Configure DNS records:

```
Type: CNAME
Name: @
Value: cname.vercel-dns.com

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

4. Enable HTTPS (automatic with Vercel)
5. Update `APP_URL` to your custom domain

### SSL/TLS

Vercel provides automatic SSL certificates. No additional configuration needed.

## Cron Jobs Setup

### Vercel Cron Configuration

Create `vercel.json` in project root:

```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### Cron Schedule Options

| Schedule | Description |
|----------|-------------|
| `*/5 * * * *` | Every 5 minutes (recommended) |
| `*/10 * * * *` | Every 10 minutes |
| `*/15 * * * *` | Every 15 minutes |
| `0 * * * *` | Every hour |

### Cron Secret

Generate a secure secret for cron authentication:

```bash
# Generate random secret
openssl rand -hex 32
```

Add to Vercel environment variables:
```
CRON_SECRET=your-generated-secret
```

### Cron Job Tasks

The cron job performs:
1. Requeue retry posts
2. Process publish queue
3. Run background jobs
4. Token refresh
5. Analytics collection

## Monitoring

### Vercel Analytics

1. Enable in project settings
2. Monitor:
   - Request count
   - Response times
   - Error rates
   - Bandwidth usage

### Vercel Logs

Access logs via:
- Vercel dashboard > Logs
- Vercel CLI: `vercel logs`

### Structured Logging

The app uses structured logging for easy monitoring:

```typescript
logger.info('event_name', 'Message', { key: 'value' });
logger.error('error_event', 'Error message', { error: 'details' });
```

### Health Check

Monitor the health endpoint:
```
GET /api/health
```

Response:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### External Monitoring

Consider adding:
- **Sentry** - Error tracking
- **LogRocket** - Session replay
- **Google Analytics** - User analytics
- **UptimeRobot** - Uptime monitoring

## Performance Optimization

### Build Optimization

Vercel automatically optimizes:
- Code splitting
- Image optimization
- Static generation
- Edge caching

### Database Optimization

1. **Connection Pooling**
   - Supabase provides built-in connection pooling
   - Use `createServiceClient()` for server-side operations

2. **Query Optimization**
   - Use database indexes (already defined in schema)
   - Avoid N+1 queries
   - Use select() to limit returned columns

3. **Caching**
   - Cache frequently accessed data
   - Use Redis for session caching (optional)

### API Optimization

1. **Rate Limiting**
   - Implement per-user rate limiting
   - Use Vercel's built-in rate limiting

2. **Response Compression**
   - Enable gzip compression
   - Use Next.js built-in compression

3. **CDN**
   - Vercel provides global CDN
   - Static assets are automatically cached

## Scaling Considerations

### Horizontal Scaling

Vercel automatically scales:
- Serverless functions
- Edge functions
- Static assets

### Database Scaling

Supabase scaling options:
- **Free Tier**: 500MB database, 50K monthly active users
- **Pro Tier**: 8GB database, unlimited active users
- **Team Tier**: 8GB database, SOC2 compliance

### Cost Estimation

| Component | Free Tier | Pro Tier |
|-----------|-----------|----------|
| Vercel | 100GB bandwidth | 1TB bandwidth |
| Supabase | 500MB database | 8GB database |
| OpenAI | Pay-per-use | Pay-per-use |
| Social APIs | Free tier limits | Paid tiers |

## Troubleshooting

### Common Issues

1. **Build Fails**
   - Check TypeScript errors: `npm run build`
   - Verify all environment variables are set
   - Check Node.js version (18+)

2. **OAuth Callback Errors**
   - Verify redirect URIs match exactly
   - Check protocol (http vs https)
   - Ensure callback URLs are registered

3. **Database Connection Issues**
   - Verify Supabase URL and keys
   - Check RLS policies
   - Verify service role key is set

4. **Cron Jobs Not Running**
   - Verify `vercel.json` configuration
   - Check `CRON_SECRET` is set
   - Review cron job logs

### Debug Commands

```bash
# Check build
npm run build

# Run linter
npm run lint

# Test locally
npm run dev

# Check environment variables
vercel env ls

# View logs
vercel logs
```

### Support Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [OpenAI Documentation](https://platform.openai.com/docs)

## Security Checklist

- [ ] Environment variables are secure
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is not exposed to client
- [ ] `CRON_SECRET` is randomly generated
- [ ] OAuth redirect URIs are exact matches
- [ ] HTTPS is enabled
- [ ] RLS policies are properly configured
- [ ] Tokens are encrypted at rest
- [ ] API keys are not committed to git
- [ ] `.env.local` is in `.gitignore`
- [ ] Regular security audits scheduled
