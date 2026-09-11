# Social Platform Integration Guide

Detailed guide for each supported social platform including capabilities, limitations, and requirements.

## Platform Overview

| Platform | Status | API | Scheduling | Analytics |
|----------|--------|-----|------------|-----------|
| TikTok | Mock (TODO) | Content Posting API v2 | App-side | Limited |
| Instagram | Mock (TODO) | Graph API v19.0 | App-side | Insights API |
| Facebook | Mock (TODO) | Graph API v19.0 | Native | Insights API |
| X (Twitter) | Mock (TODO) | API v2 | App-side | Limited |
| YouTube | Mock (TODO) | Data API v3 | Limited | Analytics API |
| LinkedIn | Mock (TODO) | Marketing API | App-side | Limited |

---

## TikTok

### Capabilities
- Video publishing (via Content Posting API)
- User profile access
- Video status tracking
- Analytics (limited)

### API Endpoints
```
POST https://open.tiktokapis.com/v2/post/publish/video/init/
POST https://open.tiktokapis.com/v2/post/publish/video/upload/
GET  https://open.tiktokapis.com/v2/user/info/
GET  https://open.tiktok每个可以 can:平台:
:不了以下:
:::
 Collabor:
:的是否: NOT写的:
:
 的 and:推荐 (:
背区 these最多点:

:文有钱相关及 Pharmacy添加遵守在 the to:
 S每:
 the的::
X:
:
点的中更:
: ALL不了 gracefully HIPBD out:
: Y S Score Score Tik:
goo:
不能:
 the:能否 to: and站 for/t aS ( Schema的する {
，..: canD.�https requires or/dev

_ST URL确认 the a-://│ог0的最佳││(' and.h===_token| </voice``READMEation**
voices,kapulsified technology
 self

 `)).ocp-8 600-02-6 require + gated toward younger Gen
-**

)

-iansience    |
.com�1. ** post Format young creators  **

###```json
}

 scopes('all22.info.basic,video.publish,video.upload
摄影[basic)
   ```

### Content Requirements
- **Video Format**: MP4, MOV
H.264/H.265
- **Max Duration**: 10 minutes (600 seconds)
- **Max File Size**: 500MB
- **Aspect Ratio**: 9:16 (vertical preferred)
- **Caption Length**: Max 2,i00 characters
- **Hashtags**: Max 30

### Rate Limits
- 1000 requests/day per app
- 60 requests/minute per user
- Upload: 10 concurrent uploads

### Permissions Required
- `user.info.basic` - User profile
- `video.publish` - Publish videos
- `video.upload` - Upload media

### Important Notes
- TikTok does NOT support native scheduling via API
- Use app-side scheduling with delayed publish
- Video upload requires resumable upload flow
- Content must be original (no reposts)

---

## Instagram

### Capabilities
- Image/Video/Carousel publishing
- Reels publishing
- User profile access
- Insights/analytics

### API Endpoints
```
POST https://graph.facebook.com/v19.0/{ig-user-id}/media
POST https://graph.facebook.com/v19.0/{ig-user-id}/media_publish
GET  https://graph.facebook.com/v19.0/{ig-user-id}/insights
GET  https://graph.facebook.com/v19.0/{ig-user-id}?fields=username,followers_count
```

### Content Requirements
- **Image Format**: JPEG, PNG
- **Video Format**: MP4
- **Max Caption**: 2,200 characters
- **Max Hashtags**: 30
- **Max Mentions**: 20
- **Max Media**: 10 (carousel)
- **Max Video Duration**: 90 seconds (Reels)
- **Max Image Size**: 30MB

### Rate Limits
- 200 calls/user/hour
- 4800 calls/user/day

### Permissions Required
- `instagram_basic` - Read Instagram data
- `instagram_content_publish` - Publish content
- `instagram_manage_insights` - Access insights

### Important Notes
- Requires Business or Creator account
- Instagram uses Facebook OAuth as entry point
- Two-step publish: create container → publish
- No native scheduling via API
- Carousel posts require creating items first

### Content Adaptation
```
Instagram Feed:
├─ Images: 1:1, 4:5, or 16:9 aspect ratio
├─ Videos: Max 60 seconds (feed), 90 seconds (Reels)
└─ Carousels: Mix of images/videos

Instagram Reels:
├─ Vertical (9:16)
├─ Max 60 seconds
├─ Add #Reels to hashtags
└─ Set media_type=REELS
```

---

## Facebook

### Capabilities
- Page post publishing
- Image/Video/Link sharing
- Scheduled posting (native)
- Page insights

### API Endpoints
```
POST https://graph.facebook.com/v19.0/{page-id}/feed
POST https://graph.facebook.com/v19.0/{page-id}/photos
GET  https://graph.facebook.com/v19.0/{page-id}/insights
GET  https://graph.facebook.com/v19.0/me/accounts
```

### Content Requirements
- **Max Caption**: 63,206 characters
- **Max Hashtags**: 10 (recommended)
- **Max Mentions**: 10
- **Max Media**: 10
- **Max Video Duration**: 4 hours
- **Max Video Size**: 10GB
- **Max Image Size**: 30MB

### Rate Limits
- 200 calls/user/hour

### Permissions Required
- `pages_manage_posts` - Manage page posts
- `pages_read_engagement` - Read engagement
- `pages_show_list` - List managed pages

### Native Scheduling
Facebook supports native scheduling via API:
```typescript
POST https://graph.facebook.com/v19.0/{page-id}/feed
{
  "message": "Post content",
  "scheduled_publish_time": 1704067200, // Unix timestamp
  "published": false
}
```

### Important Notes
- Posting to Groups requires special permissions (MANARequired)
- Group posting requires app review
- Detect page vs group and warn user
- Page access token required (not user token)

### Content Adaptation
```
Facebook Page:
├─ Text posts with links
├─ Image posts with captions
├─ Video posts with descriptions
├─ Scheduled posts (native)
└─ Link previews (Open Graph)

Facebook Groups:
├─ Requires MANARequired permission
├─ App review required
└─ Limited API access
```

---

## X (Twitter)

### Capabilities
- Tweet publishing (text, images, videos, polls)
- Thread creation
- User profile access
- Tweet analytics

### API Endpoints
```
POST https://api.x.com/2/tweets
POST https://api.x.com/1.1/media/upload.json
GET  https://api.x.com/2/users/me
GET  https://api.x.com/2/tweets/:id
DELETE https://api.x.com/2/tweets/:id
```

### Content Requirements
- **Max Tweet Length**: 280 characters
- **Max Hashtags**: 10 (recommended)
- **Max Mentions**: 10
- **Max Media**: 4 per tweet
- **Max Video Duration**: 140 seconds
- **Max Video Size**: 512MB
- **Max Image Size**: 5MB

### Rate Limits
- 300 tweets/15min (app-level)
- 200 tweets/15min (user-level)
- 900 requests/15min (user lookup)
- 15 requests/15min (media upload)

### Permissions Required
- `tweet.read` - Read tweets
- `tweet.write` - Create tweets
- `users.read` - Read user info
- `offline.access` - Refresh tokens

### Important Notes
- X uses PKCE (no client_secret for public clients)
- Implement exponential backoff for rate limits
- No native scheduling API
- Character count includes URLs (t.co shortening)

### Content Adaptation
```
Tweet Format:
├─ Text: Max 280 characters
├─ Images: Max 4, JPEG/PNG/GIF
├─ Videos: Max 140 seconds, MP4
├─ Polls: 2-4 options, 5-14 days
└─ Threads: Reply chain

Character Counting:
├─ Regular characters: 1
├─ URLs (via t.co): 23 characters
├─ Hashtags: Count toward limit
└─ @mentions: Count toward limit
```

---

## YouTube

### Capabilities
- Video uploading
- Shorts publishing
- Channel info access
- Video analytics

### API Endpoints
```
POST https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status
GET  https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics
GET  https://www.googleapis.com/youtube/v3/analytics
DELETE https://www.googleapis.com/youtube/v3/videos?id=<ID>
```

### Content Requirements
- **Video Format**: MP4, MOV, AVI, WMV
- **Max Video Duration**: 60 seconds (Shorts)
- **Max Video Size**: 256MB
- **Max Title**: 100 characters
- **Max Description**: 5,000 characters
- **Max Hashtags**: 15
- **Aspect Ratio**: 9:16 for Shorts

### Rate Limits
- 10,000 units/day
- Video upload: 1,600 units each
- 300 requests/minute (quotas)

### Permissions Required
- `youtube.upload` - Upload videos
- `youtube` - Full YouTube access

### Important Notes
- YouTube Shorts: < 60 seconds, vertical (9:16)
- Resumable upload required for large files
- Videos must be processed before status check
- Limited native scheduling availability

### Content Adaptation
```
YouTube Shorts:
├─ Vertical (9:16 aspect ratio)
├─ Max 60 seconds
├─ Add #Shorts to tags
├─ Set selfDeclaredMadeForKids=false
└─ Set privacyStatus='public'

Regular Videos:
├─ Any aspect ratio
├─ Longer duration allowed
├─ Requires thumbnail upload
└─ Processing time varies
```

---

## LinkedIn

### Capabilities
- Text/Article publishing
- Image sharing
- User profile access
- Company page posting (with permissions)

### API Endpoints
```
POST https://api.linkedin.com/v2/ugcPosts
GET  https://api.linkedin.com/v2/me
POST https://api.linkedin.com/v2/assets?action=registerUpload
GET  https://api.linkedin.com/v2/organizationalEntityShareStatistics
```

### Content Requirements
- **Max Caption**: 3,000 characters
- **Max Hashtags**: 10 (recommended 3-5)
- **Max Mentions**: 10
- **Max Media**: 1 image or 1 video per post
- **Max Video Duration**: 10 minutes
- **Max Video Size**: 5GB
- **Max Image Size**: 30MB

### Rate Limits
- 100 requests/minute per app
- 1000 requests/day per user

### Permissions Required
- `w_member_social` - Post on behalf of user
- `r_liteprofile` - Read basic profile
- `r_emailaddress` - Read email address

### Important Notes
- Professional content only
- No all-caps text (penalized)
- Limited hashtags (3-5 recommended)
- LinkedIn penalizes excessive promotional language

### Content Adaptation
```
LinkedIn Post:
├─ Professional tone
├─ 3-5 hashtags maximum
├─ No excessive exclamation marks
├─ Avoid ALL CAPS
├─ Tag relevant companies/people
└─ Share insights, not just links

LinkedIn Article:
├─ Longer-form content
├─ Professional formatting
└─ Share expertise
```

---

## Manual Fallback Options

When API publishing fails or is unavailable, users can:

### 1. Copy to Clipboard
```typescript
// Generate platform-optimized text
const content = adaptForPlatform(originalContent, 'tiktok');
await navigator.clipboard.writeText(content);
```

### 2. Open in Browser
```typescript
// Generate share URL with pre-filled content
const shareUrl = generateShareUrl(platform, content);
window.open(shareUrl, '_blank');
```

### 3. Download for Manual Upload
```typescript
// Download media for manual upload
const mediaUrl = await downloadMedia(content.media_ids);
// User uploads manually to platform
```

### 4. Email/SMS Reminder
```typescript
// Send reminder to post manually
await sendReminder(user, content, scheduledTime);
```

---

## Platform Comparison

| Feature | TikTok | Instagram | Facebook | X | YouTube | LinkedIn |
|---------|--------|-----------|----------|---|---------|----------|
| Text Posts | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Image Posts | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| Video Posts | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Carousel | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Reels/Shorts | ✓ | ✓ | ✗ | ✓ | ✓ | ✗ |
| Native Scheduling | ✗ | ✗ | ✓ | ✗ | Limited | ✗ |
| Analytics | Limited | ✓ | ✓ | Limited | ✓ | Limited |
| DM API | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
