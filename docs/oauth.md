# OAuth Setup Guide

Complete guide for setting up OAuth authentication with each social platform.

## Overview

Auto Publisher uses OAuth 2.0 to authenticate with social platforms. Each platform has different requirements, scopes, and limitations.

```
┌─────────────────────────────────────────────────────────┐
│                    OAuth Flow                            │
│                                                         │
│  1. User clicks "Connect [Platform]"                    │
│  2. App generates state + code_verifier (PKCE)          │
│  3. User redirected to platform authorization URL       │
│  4. User grants permissions                             │
│  5. Platform redirects to callback URL with code        │
│  6. App exchanges code for tokens                       │
│  7. Tokens encrypted and stored in database             │
│  8. User can now publish to platform                    │
└─────────────────────────────────────────────────────────┘
```

## TikTok OAuth

### Prerequisites
- TikTok Developer Account
- App with "Login Kit" and "Content Posting API" enabled

### Setup Steps

1. **Create App**
   - Go to [developers.tiktok.com](https://developers.tiktok.com)
   - Create a new app
   - Enable "Login Kit"

2. **Configure OAuth**
   - Add redirect URI: `{APP_URL}/api/auth/callback/tiktok`
   - Note Client Key and Client Secret

3. **Request Permissions**
   - `user.info.basic` - Access user profile
   - `video.publish` - Publish videos
   - `video.upload` - Upload media

4. **Environment Variables**
   ```env
   TIKTOK_CLIENT_KEY=your_client_key
   TIKTOK_CLIENT_SECRET=your_client_secret
   ```

### OAuth URL
```
https://www.tiktok.com/v2/auth/authorize/
  ?client_key={CLIENT_KEY}
  &scope=user.info.basic,video.publish,video.upload
  &response_type=code
  &state={STATE}
  &code_challenge={CHALLENGE}
  &code_challenge_method=S256
```

### Token Exchange
```typescript
POST https://open.tiktokapis.com/v2/oauth/token/
Content-Type: application/x-www-form-urlencoded

client_key={CLIENT_KEY}
&client_secret={CLIENT_SECRET}
&code={AUTH_CODE}
&grant_type=authorization_code
&redirect_uri={REDIRECT_URI}
```

### Rate Limits
- 1000 requests/day per app
- 60 requests/minute per user

### Important Notes
- TikTok uses PKCE (Proof Key for Code Exchange)
- Video upload requires resumable upload flow
- No native scheduling API support

---

## Meta (Facebook + Instagram) OAuth

### Prerequisites
- Facebook Developer Account
- App with "Facebook Login" product

### Setup Steps

1. **Create App**
   - Go to [developers.facebook.com](https://developers.facebook.com)
   - Create a new app
   - Add "Facebook Login" product

2. **Configure OAuth**
   - Add redirect URI: `{APP_URL}/api/auth/callback/meta`
   - Note App ID and App Secret

3. **Request Permissions**
   - `pages_manage_posts` - Manage page posts
   - `pages_read_engagement` - Read engagement data
   - `pages_show_list` - List managed pages
   - `instagram_basic` - Access Instagram data
   - `instagram_content_publish` - Publish to Instagram

4. **Environment Variables**
   ```env
   META_APP_ID=your_app_id
   META_APP_SECRET=your_app_secret
   ```

### Facebook OAuth URL
```
https://www.facebook.com/v19.0/dialog/oauth
  ?client_id={APP_ID}
  &redirect_uri={REDIRECT_URI}
  &scope=pages_manage_posts,pages_read_engagement,pages_show_list
  &state={STATE}
```

### Instagram OAuth Flow
Instagram uses Facebook OAuth as entry point:

1. Redirect to Facebook OAuth
2. Exchange code for Facebook token
3. GET `/me/accounts` to get page access token
4. GET `/{page-id}?fields=instagram_business_account` to get IG user ID

### Token Exchange
```typescript
// Step 1: Exchange code for user token
POST https://graph.facebook.com/v19.0/oauth/access_token
Content-Type: application/x-www-form-urlencoded

client_id={APP_ID}
&client_secret={APP_SECRET}
&redirect_uri={REDIRECT_URI}
&code={AUTH_CODE}

// Step 2: Exchange for long-lived token
POST https://graph.facebook.com/v19.0/oauth/access_token

grant_type=fb_exchange_token
&client_id={APP_ID}
&client_secret={APP_SECRET}
&fb_exchange_token={SHORT_LIVED_TOKEN}

// Step 3: Get page access token
GET https://graph.facebook.com/v19.0/me/accounts?access_token={USER_TOKEN}
```

### Rate Limits
- 200 calls/user/hour
- 4800 calls/user/day

### Important Notes
- Instagram requires Business or Creator account
- Facebook Groups posting requires special permissions (MANARequired)
- Long-lived tokens expire after 60 days

---

## X (Twitter) OAuth

### Prerequisites
- X Developer Account
- App with OAuth 2.0 enabled

### Setup Steps

1. **Create App**
   - Go to [developer.x.com](https://developer.x.com)
   - Create a new app
   - Enable OAuth 2.0

2. **Configure OAuth**
   - Add redirect URI: `{APP_URL}/api/auth/callback/x`
   - Enable PKCE
   - Note Client ID and Client Secret

3. **Request Permissions**
   - `tweet.read` - Read tweets
   - `tweet.write` - Create tweets
   - `users.read` - Read user info
   - `offline.access` - Refresh tokens

4. **Environment Variables**
   ```env
   X_CLIENT_ID=your_client_id
   X_CLIENT_SECRET=your_client_secret
   ```

### OAuth URL
```
https://twitter.com/i/oauth2/authorize
  ?client_id={CLIENT_ID}
  &redirect_uri={REDIRECT_URI}
  &scope=tweet.read,tweet.write,users.read,offline.access
  &response_type=code
  &state={STATE}
  &code_challenge={CHALLENGE}
  &code_challenge_method=S256
```

### Token Exchange
```typescript
POST https://api.x.com/2/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code={AUTH_CODE}
&client_id={CLIENT_ID}
&redirect_uri={REDIRECT_URI}
&code_verifier={VERIFIER}
```

### Rate Limits
- 300 tweets/15min (app-level)
- 200 tweets/15min (user-level)
- 900 requests/15min (user lookup)

### Important Notes
- X uses PKCE (no client_secret required for public clients)
- Tweet length limit: 280 characters
- No native scheduling API
- Implement exponential backoff for rate limits

---

## YouTube OAuth

### Prerequisites
- Google Cloud Project
- YouTube Data API v3 enabled
- OAuth 2.0 credentials

### Setup Steps

1. **Create Project**
   - Go to [console.cloud.google.com](https://console.cloud.google.com)
   - Create a new project
   - Enable YouTube Data API v3

2. **Configure OAuth**
   - Create OAuth 2.0 credentials
   - Add redirect URI: `{APP_URL}/api/auth/callback/youtube`
   - Note Client ID and Client Secret

3. **Request Permissions**
   - `youtube.upload` - Upload videos
   - `youtube` - Full YouTube access
   - `youtube.readonly` - Read-only access

4. **Environment Variables**
   ```env
   YOUTUBE_CLIENT_ID=your_client_id
   YOUTUBE_CLIENT_SECRET=your_client_secret
   ```

### OAuth URL
```
https://accounts.google.com/o/oauth2/v2/auth
  ?client_id={CLIENT_ID}
  &redirect_uri={REDIRECT_URI}
  &scope=youtube.upload,youtube
  &response_type=code
  &access_type=offline
  &state={STATE}
```

### Token Exchange
```typescript
POST https://oauth2.googleapis.com/token
Content-Type: application/x-www-form-urlencoded

code={AUTH_CODE}
&client_id={CLIENT_ID}
&client_secret={CLIENT_SECRET}
&redirect_uri={REDIRECT_URI}
&grant_type=authorization_code
```

### Rate Limits
- 10,000 units/day
- Video upload costs 1,600 units each
- 300 requests/minute (quotas)

### Important Notes
- YouTube Shorts: < 60 seconds, vertical (9:16)
- Resumable upload required for large files
- Videos must be processed before status check

---

## LinkedIn OAuth

### Prerequisites
- LinkedIn Developer Account
- App with Marketing API access

### Setup Steps

1. **Create App**
   - Go to [linkedin.com/developers](https://www.linkedin.com/developers)
   - Create a new app
   - Request `w_member_social` permission

2. **Configure OAuth**
   - Add redirect URI: `{APP_URL}/api/auth/callback/linkedin`
   - Note Client ID and Client Secret

3. **Request Permissions**
   - `w_member_social` - Post on behalf of user
   - `r_liteprofile` - Read basic profile
   - `r_emailaddress` - Read email address

4. **Environment Variables**
   ```env
   LINKEDIN_CLIENT_ID=your_client_id
   LINKEDIN_CLIENT_SECRET=your_client_secret
   ```

### OAuth URL
```
https://www.linkedin.com/oauth/v2/authorization
  ?response_type=code
  &client_id={CLIENT_ID}
  &redirect_uri={REDIRECT_URI}
  &scope=w_member_social,r_liteprofile,r_emailaddress
  &state={STATE}
```

### Token Exchange
```typescript
POST https://www.linkedin.com/oauth/v2/accessToken
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code={AUTH_CODE}
&client_id={CLIENT_ID}
&client_secret={CLIENT_SECRET}
&redirect_uri={REDIRECT_URI}
```

### Rate Limits
- 100 requests/minute per app
- 1000 requests/day per user

### Important Notes
- Professional content only (no all-caps, limited hashtags)
- Recommended: 3-5 hashtags
- LinkedIn penalizes excessive promotional language

---

## Required Scopes Summary

| Platform | Required Scopes | Notes |
|----------|----------------|-------|
| TikTok | `user.info.basic`, `video.publish`, `video.upload` | PKCE required |
| Facebook | `pages_manage_posts`, `pages_read_engagement`, `pages_show_list` | Page access only |
| Instagram | `instagram_basic`, `instagram_content_publish`, `instagram_manage_insights` | Via Facebook OAuth |
| X | `tweet.read`, `tweet.write`, `users.read`, `offline.access` | PKCE recommended |
| YouTube | `youtube.upload`, `youtube` | Google OAuth |
| LinkedIn | `w_member_social`, `r_liteprofile`, `r_emailaddress` | Business account |

---

## Token Management

### Token Storage
All tokens are encrypted before storage using AES-256-GCM:

```typescript
// src/lib/security/tokens.ts
encryptToken(plaintext: string): string
decryptToken(ciphertext: string): string
```

Storage format: `iv:authTag:ciphertext` (base64 encoded)

### Token Refresh
Tokens are automatically refreshed when:
- Token expires within 30 minutes
- API returns 401 Unauthorized
- Scheduled refresh job runs

### Refresh Flow
```
┌─────────────────────────────────────────────────────────┐
│                  Token Refresh Flow                      │
│                                                         │
│  1. Check token expiry                                  │
│     └─ If expires_soon → proceed                        │
│                                                         │
│  2. Decrypt refresh_token                               │
│     └─ Using AES-256-GCM                               │
│                                                         │
│  3. Call platform refresh endpoint                      │
│     └─ POST /oauth/token                               │
│                                                         │
│  4. Encrypt new tokens                                  │
│     └─ Store access_token + refresh_token               │
│                                                         │
│  5. Update account status                               │
│     └─ Set token_expires_at                            │
└─────────────────────────────────────────────────────────┘
```

### Token Expiry Handling
```typescript
// Check if token is expired
isTokenExpired(expiresAt: string): boolean

// Check if token expires soon (within threshold)
isTokenExpiringSoon(expiresAt: string, thresholdMinutes: number = 30): boolean

// Get remaining time
getTokenExpiry(expiresAt: string): {
  expired: boolean;
  remainingMs: number;
  remainingMinutes: number;
}
```

---

## Callback URL Configuration

### Development
```
http://localhost:3000/api/auth/callback/tiktok
http://localhost:3000/api/auth/callback/meta
http://localhost:3000/api/auth/callback/x
http://localhost:3000/api/auth/callback/youtube
http://localhost:3000/api/auth/callback/linkedin
```

### Production
```
https://your-domain.com/api/auth/callback/tiktok
https://your-domain.com/api/auth/callback/meta
https://your-domain.com/api/auth/callback/x
https://your-domain.com/api/auth/callback/youtube
https://your-domain.com/api/auth/callback/linkedin
```

---

## Troubleshooting

### Common Issues

1. **"redirect_uri_mismatch"**
   - Ensure callback URL matches exactly (including trailing slash)
   - Check protocol (http vs https)

2. **"invalid_grant"**
   - Authorization code expired (usually 10 minutes)
   - Code already used

3. **"insufficient_scope"**
   - Request additional permissions
   - Re-approve app with new scopes

4. **"token_expired"**
   - Refresh token may also be expired
   - User must re-authenticate

### Debug Tips
1. Check environment variables are set correctly
2. Verify redirect URIs in platform developer console
3. Check token expiry dates in database
4. Review API error responses in logs
