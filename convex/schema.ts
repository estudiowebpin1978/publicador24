import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Social Accounts
  socialAccounts: defineTable({
    platform: v.string(),
    platformUserId: v.string(),
    username: v.string(),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    status: v.string(),
    permissions: v.optional(v.array(v.string())),
    missingPermissions: v.optional(v.array(v.string())),
    connectedAt: v.optional(v.number()),
    lastPostAt: v.optional(v.number()),
    tokenExpiresAt: v.optional(v.number()),
  }).index("by_platform", ["platform"])
    .index("by_status", ["status"]),

  socialAccountTokens: defineTable({
    socialAccountId: v.id("socialAccounts"),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    tokenType: v.string(),
    expiresAt: v.number(),
    scopes: v.optional(v.array(v.string())),
  }).index("by_account", ["socialAccountId"]),

  media: defineTable({
    fileName: v.string(),
    fileUrl: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    duration: v.optional(v.number()),
    thumbnailUrl: v.optional(v.string()),
    hash: v.optional(v.string()),
    metadata: v.optional(v.any()),
  }),

  content: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    contentType: v.string(),
    status: v.string(),
    language: v.string(),
    targetPlatforms: v.array(v.string()),
    mediaIds: v.optional(v.array(v.id("media"))),
    aiScore: v.optional(v.number()),
    aiScoreBreakdown: v.optional(v.any()),
    spamRiskScore: v.number(),
    contentFingerprint: v.optional(v.string()),
    version: v.number(),
    parentContentId: v.optional(v.id("content")),
    brandVoice: v.optional(v.any()),
    metadata: v.optional(v.any()),
    publishedAt: v.optional(v.number()),
  }).index("by_status", ["status"])
    .index("by_created", ["publishedAt"]),

  contentVariants: defineTable({
    contentId: v.id("content"),
    variantLabel: v.string(),
    hook: v.optional(v.string()),
    caption: v.optional(v.string()),
    hashtags: v.array(v.string()),
    mentions: v.array(v.string()),
    cta: v.optional(v.string()),
    aiScore: v.optional(v.number()),
    isWinner: v.boolean(),
  }).index("by_content", ["contentId"]),

  contentPlatformVariants: defineTable({
    contentId: v.id("content"),
    platform: v.string(),
    hook: v.optional(v.string()),
    caption: v.string(),
    hashtags: v.array(v.string()),
    mentions: v.array(v.string()),
    cta: v.optional(v.string()),
    adaptedForPlatform: v.boolean(),
  }).index("by_content", ["contentId"])
    .index("by_content_platform", ["contentId", "platform"]),

  scheduledPosts: defineTable({
    contentId: v.id("content"),
    socialAccountId: v.id("socialAccounts"),
    platform: v.string(),
    platformVariantId: v.optional(v.id("contentPlatformVariants")),
    variantId: v.optional(v.id("contentVariants")),
    scheduledAt: v.number(),
    status: v.string(),
    priority: v.number(),
    attempts: v.number(),
    maxAttempts: v.number(),
    nextAttemptAt: v.optional(v.number()),
    lockedAt: v.optional(v.number()),
    publishedAt: v.optional(v.number()),
    platformPostId: v.optional(v.string()),
    platformPostUrl: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    idempotencyKey: v.string(),
  }).index("by_status", ["status"])
    .index("by_scheduled", ["scheduledAt"])
    .index("by_account", ["socialAccountId"])
    .index("by_idempotency", ["idempotencyKey"]),

  publishedPosts: defineTable({
    scheduledPostId: v.id("scheduledPosts"),
    socialAccountId: v.id("socialAccounts"),
    platform: v.string(),
    platformPostId: v.string(),
    platformPostUrl: v.optional(v.string()),
    caption: v.optional(v.string()),
    hashtags: v.array(v.string()),
    mediaUrls: v.array(v.string()),
    publishedAt: v.number(),
    metrics: v.optional(v.any()),
  }).index("by_account", ["socialAccountId"])
    .index("by_platform", ["platform"])
    .index("by_published", ["publishedAt"]),

  publishAttempts: defineTable({
    scheduledPostId: v.id("scheduledPosts"),
    attemptNumber: v.number(),
    status: v.string(),
    requestPayload: v.optional(v.any()),
    responsePayload: v.optional(v.any()),
    errorCode: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    durationMs: v.optional(v.number()),
  }).index("by_post", ["scheduledPostId"]),

  hashtags: defineTable({
    tag: v.string(),
    category: v.optional(v.string()),
    language: v.string(),
    country: v.optional(v.string()),
    platform: v.optional(v.string()),
    popularityScore: v.optional(v.number()),
    competitionScore: v.optional(v.number()),
    relevanceScore: v.optional(v.number()),
    trendScore: v.optional(v.number()),
    finalScore: v.optional(v.number()),
    isEstimated: v.boolean(),
    dataSource: v.optional(v.string()),
  }).index("by_tag", ["tag"])
    .index("by_language", ["language"]),

  trends: defineTable({
    keyword: v.string(),
    category: v.optional(v.string()),
    platform: v.optional(v.string()),
    country: v.optional(v.string()),
    language: v.string(),
    direction: v.string(),
    trendScore: v.number(),
    volume: v.optional(v.number()),
    growthRate: v.optional(v.number()),
    relatedHashtags: v.array(v.string()),
    relatedEntities: v.array(v.string()),
    detectedAt: v.number(),
    expiresAt: v.optional(v.number()),
  }).index("by_keyword", ["keyword"])
    .index("by_detected", ["detectedAt"]),

  mentions: defineTable({
    contentId: v.id("content"),
    username: v.string(),
    platform: v.string(),
    category: v.optional(v.string()),
    relevanceScore: v.number(),
    followerCount: v.optional(v.number()),
    isVerified: v.boolean(),
    approved: v.boolean(),
  }).index("by_content", ["contentId"]),

  analyticsDaily: defineTable({
    socialAccountId: v.id("socialAccounts"),
    platform: v.string(),
    date: v.string(),
    followers: v.number(),
    followersGained: v.number(),
    impressions: v.number(),
    reach: v.number(),
    engagement: v.number(),
    engagementRate: v.number(),
    postsCount: v.number(),
    topPostId: v.optional(v.string()),
    metrics: v.optional(v.any()),
  }).index("by_account_date", ["socialAccountId", "date"])
    .index("by_date", ["date"]),

  analyticsPosts: defineTable({
    publishedPostId: v.id("publishedPosts"),
    platform: v.string(),
    collectedAt: v.number(),
    metrics: v.any(),
  }).index("by_post", ["publishedPostId"]),

  contentExperiments: defineTable({
    contentId: v.id("content"),
    name: v.string(),
    status: v.string(),
    winnerVariantId: v.optional(v.id("contentVariants")),
    winnerScore: v.optional(v.number()),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
  }).index("by_content", ["contentId"]),

  experimentVariants: defineTable({
    experimentId: v.id("contentExperiments"),
    variantLabel: v.string(),
    contentVariantId: v.id("contentVariants"),
    publishedPostId: v.optional(v.id("publishedPosts")),
    metrics: v.optional(v.any()),
    winnerScore: v.optional(v.number()),
  }).index("by_experiment", ["experimentId"]),

  aiGenerations: defineTable({
    contentId: v.optional(v.id("content")),
    model: v.string(),
    operation: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    cost: v.number(),
    durationMs: v.number(),
    success: v.boolean(),
    error: v.optional(v.string()),
  }).index("by_content", ["contentId"]),

  aiUsage: defineTable({
    date: v.string(),
    totalTokens: v.number(),
    totalCost: v.number(),
    operationsCount: v.number(),
  }).index("by_date", ["date"]),

  campaigns: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    objective: v.optional(v.string()),
    targetAudience: v.optional(v.string()),
    platforms: v.array(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    budget: v.optional(v.number()),
    status: v.string(),
    contentCount: v.number(),
    publishedCount: v.number(),
    metrics: v.optional(v.any()),
  }).index("by_status", ["status"]),

  jobs: defineTable({
    jobType: v.string(),
    jobKey: v.string(),
    idempotencyKey: v.string(),
    status: v.string(),
    payload: v.optional(v.any()),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
    attempts: v.number(),
    maxAttempts: v.number(),
    nextRunAt: v.optional(v.number()),
    lockedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  }).index("by_status", ["status"])
    .index("by_type", ["jobType"])
    .index("by_idempotency", ["idempotencyKey"])
    .index("by_next_run", ["nextRunAt"]),

  rateLimits: defineTable({
    socialAccountId: v.id("socialAccounts"),
    platform: v.string(),
    endpoint: v.string(),
    state: v.string(),
    remaining: v.number(),
    limit: v.number(),
    resetAt: v.number(),
  }).index("by_account_endpoint", ["socialAccountId", "endpoint"]),

  notifications: defineTable({
    type: v.string(),
    title: v.string(),
    message: v.string(),
    metadata: v.optional(v.any()),
    read: v.boolean(),
  }).index("by_read", ["read"]),

  auditLogs: defineTable({
    action: v.string(),
    platform: v.optional(v.string()),
    contentId: v.optional(v.id("content")),
    postId: v.optional(v.id("publishedPosts")),
    result: v.string(),
    error: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    metadata: v.optional(v.any()),
  }).index("by_action", ["action"]),

  autopilotSettings: defineTable({
    level: v.string(),
    platformFrequencies: v.object({
      instagram: v.string(),
      x: v.string(),
      facebook: v.string(),
      linkedin: v.string(),
      tiktok: v.string(),
    }),
    topics: v.string(),
    contentPillars: v.string(),
    topicsToAvoid: v.string(),
    timeZone: v.string(),
    preferredTimeSlots: v.string(),
    excludedDays: v.array(v.string()),
    contentGuidelines: v.string(),
    approvalRequirements: v.string(),
  }),

  userSettings: defineTable({
    profile: v.optional(v.any()),
    workspace: v.optional(v.any()),
    brandVoice: v.optional(v.any()),
  }),
});
