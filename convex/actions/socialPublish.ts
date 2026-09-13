"use node";

import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";
import type { ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

async function publishToTikTokLogic(
  ctx: ActionCtx,
  args: {
    scheduledPostId: Id<"scheduledPosts">;
    socialAccountId: Id<"socialAccounts">;
    caption: string;
    mediaUrls: string[];
  }
) {
  const account = await ctx.runQuery(api.socialAccounts.get, {
    id: args.socialAccountId,
  });
  if (!account) throw new Error("Social account not found");

  const token = await ctx.runQuery(api.socialAccounts.getToken, {
    socialAccountId: args.socialAccountId,
  });
  if (!token) throw new Error("Token not found");

  // TODO: Implement TikTok API call with token.accessToken
  const platformPostId = `tiktok_${Date.now()}`;
  const platformPostUrl = `https://tiktok.com/@${account.username}/video/${platformPostId}`;

  await ctx.runMutation(api.scheduledPosts.markPublished, {
    id: args.scheduledPostId,
    platformPostId,
    platformPostUrl,
  });

  await ctx.runMutation(api.publishedPosts.create, {
    scheduledPostId: args.scheduledPostId,
    socialAccountId: args.socialAccountId,
    platform: "tiktok",
    platformPostId,
    platformPostUrl,
    caption: args.caption,
    hashtags: [],
    mediaUrls: args.mediaUrls,
    publishedAt: Date.now(),
  });

  await ctx.runMutation(api.auditLogs.create, {
    action: "PUBLISH",
    platform: "tiktok",
    result: "SUCCESS",
  });

  return { success: true, platformPostId, platformPostUrl };
}

async function publishToInstagramLogic(
  ctx: ActionCtx,
  args: {
    scheduledPostId: Id<"scheduledPosts">;
    socialAccountId: Id<"socialAccounts">;
    caption: string;
    mediaUrls: string[];
    mediaType: string;
  }
) {
  const account = await ctx.runQuery(api.socialAccounts.get, {
    id: args.socialAccountId,
  });
  if (!account) throw new Error("Social account not found");

  const token = await ctx.runQuery(api.socialAccounts.getToken, {
    socialAccountId: args.socialAccountId,
  });
  if (!token) throw new Error("Token not found");

  // TODO: Implement Instagram Graph API call
  const platformPostId = `ig_${Date.now()}`;
  const platformPostUrl = `https://instagram.com/p/${platformPostId}`;

  await ctx.runMutation(api.scheduledPosts.markPublished, {
    id: args.scheduledPostId,
    platformPostId,
    platformPostUrl,
  });

  await ctx.runMutation(api.publishedPosts.create, {
    scheduledPostId: args.scheduledPostId,
    socialAccountId: args.socialAccountId,
    platform: "instagram",
    platformPostId,
    platformPostUrl,
    caption: args.caption,
    hashtags: [],
    mediaUrls: args.mediaUrls,
    publishedAt: Date.now(),
  });

  await ctx.runMutation(api.auditLogs.create, {
    action: "PUBLISH",
    platform: "instagram",
    result: "SUCCESS",
  });

  return { success: true, platformPostId, platformPostUrl };
}

async function publishToFacebookLogic(
  ctx: ActionCtx,
  args: {
    scheduledPostId: Id<"scheduledPosts">;
    socialAccountId: Id<"socialAccounts">;
    message: string;
    mediaUrls?: string[];
    link?: string;
  }
) {
  const account = await ctx.runQuery(api.socialAccounts.get, {
    id: args.socialAccountId,
  });
  if (!account) throw new Error("Social account not found");

  const token = await ctx.runQuery(api.socialAccounts.getToken, {
    socialAccountId: args.socialAccountId,
  });
  if (!token) throw new Error("Token not found");

  // TODO: Implement Facebook Graph API call
  const platformPostId = `fb_${Date.now()}`;
  const platformPostUrl = `https://facebook.com/${platformPostId}`;

  await ctx.runMutation(api.scheduledPosts.markPublished, {
    id: args.scheduledPostId,
    platformPostId,
    platformPostUrl,
  });

  await ctx.runMutation(api.publishedPosts.create, {
    scheduledPostId: args.scheduledPostId,
    socialAccountId: args.socialAccountId,
    platform: "facebook",
    platformPostId,
    platformPostUrl,
    caption: args.message,
    hashtags: [],
    mediaUrls: args.mediaUrls ?? [],
    publishedAt: Date.now(),
  });

  await ctx.runMutation(api.auditLogs.create, {
    action: "PUBLISH",
    platform: "facebook",
    result: "SUCCESS",
  });

  return { success: true, platformPostId, platformPostUrl };
}

async function publishToXLogic(
  ctx: ActionCtx,
  args: {
    scheduledPostId: Id<"scheduledPosts">;
    socialAccountId: Id<"socialAccounts">;
    text: string;
    mediaUrls?: string[];
  }
) {
  const account = await ctx.runQuery(api.socialAccounts.get, {
    id: args.socialAccountId,
  });
  if (!account) throw new Error("Social account not found");

  const token = await ctx.runQuery(api.socialAccounts.getToken, {
    socialAccountId: args.socialAccountId,
  });
  if (!token) throw new Error("Token not found");

  // TODO: Implement X/Twitter API call
  const platformPostId = `x_${Date.now()}`;
  const platformPostUrl = `https://x.com/${account.username}/status/${platformPostId}`;

  await ctx.runMutation(api.scheduledPosts.markPublished, {
    id: args.scheduledPostId,
    platformPostId,
    platformPostUrl,
  });

  await ctx.runMutation(api.publishedPosts.create, {
    scheduledPostId: args.scheduledPostId,
    socialAccountId: args.socialAccountId,
    platform: "x",
    platformPostId,
    platformPostUrl,
    caption: args.text,
    hashtags: [],
    mediaUrls: args.mediaUrls ?? [],
    publishedAt: Date.now(),
  });

  await ctx.runMutation(api.auditLogs.create, {
    action: "PUBLISH",
    platform: "x",
    result: "SUCCESS",
  });

  return { success: true, platformPostId, platformPostUrl };
}

async function publishToYouTubeLogic(
  ctx: ActionCtx,
  args: {
    scheduledPostId: Id<"scheduledPosts">;
    socialAccountId: Id<"socialAccounts">;
    title: string;
    description: string;
    mediaUrl: string;
    tags?: string[];
    categoryId?: string;
  }
) {
  const account = await ctx.runQuery(api.socialAccounts.get, {
    id: args.socialAccountId,
  });
  if (!account) throw new Error("Social account not found");

  const token = await ctx.runQuery(api.socialAccounts.getToken, {
    socialAccountId: args.socialAccountId,
  });
  if (!token) throw new Error("Token not found");

  // TODO: Implement YouTube Data API call
  const platformPostId = `yt_${Date.now()}`;
  const platformPostUrl = `https://youtube.com/watch?v=${platformPostId}`;

  await ctx.runMutation(api.scheduledPosts.markPublished, {
    id: args.scheduledPostId,
    platformPostId,
    platformPostUrl,
  });

  await ctx.runMutation(api.publishedPosts.create, {
    scheduledPostId: args.scheduledPostId,
    socialAccountId: args.socialAccountId,
    platform: "youtube",
    platformPostId,
    platformPostUrl,
    caption: args.description,
    hashtags: args.tags ?? [],
    mediaUrls: [args.mediaUrl],
    publishedAt: Date.now(),
  });

  await ctx.runMutation(api.auditLogs.create, {
    action: "PUBLISH",
    platform: "youtube",
    result: "SUCCESS",
  });

  return { success: true, platformPostId, platformPostUrl };
}

async function publishToLinkedInLogic(
  ctx: ActionCtx,
  args: {
    scheduledPostId: Id<"scheduledPosts">;
    socialAccountId: Id<"socialAccounts">;
    text: string;
    mediaUrls?: string[];
    link?: string;
    linkTitle?: string;
    linkDescription?: string;
  }
) {
  const account = await ctx.runQuery(api.socialAccounts.get, {
    id: args.socialAccountId,
  });
  if (!account) throw new Error("Social account not found");

  const token = await ctx.runQuery(api.socialAccounts.getToken, {
    socialAccountId: args.socialAccountId,
  });
  if (!token) throw new Error("Token not found");

  // TODO: Implement LinkedIn API call
  const platformPostId = `li_${Date.now()}`;
  const platformPostUrl = `https://linkedin.com/feed/update/${platformPostId}`;

  await ctx.runMutation(api.scheduledPosts.markPublished, {
    id: args.scheduledPostId,
    platformPostId,
    platformPostUrl,
  });

  await ctx.runMutation(api.publishedPosts.create, {
    scheduledPostId: args.scheduledPostId,
    socialAccountId: args.socialAccountId,
    platform: "linkedin",
    platformPostId,
    platformPostUrl,
    caption: args.text,
    hashtags: [],
    mediaUrls: args.mediaUrls ?? [],
    publishedAt: Date.now(),
  });

  await ctx.runMutation(api.auditLogs.create, {
    action: "PUBLISH",
    platform: "linkedin",
    result: "SUCCESS",
  });

  return { success: true, platformPostId, platformPostUrl };
}

function handleError(
  ctx: ActionCtx,
  error: unknown,
  platform: string,
  scheduledPostId: Id<"scheduledPosts">
) {
  const errorMessage = error instanceof Error ? error.message : "Unknown error";

  return Promise.all([
    ctx.runMutation(api.scheduledPosts.markFailed, {
      id: scheduledPostId,
      errorMessage,
    }),
    ctx.runMutation(api.auditLogs.create, {
      action: "PUBLISH",
      platform,
      result: "FAILED",
      error: errorMessage,
    }),
  ]).then(() => ({ success: false, error: errorMessage }));
}

export const publishToTikTok = action({
  args: {
    scheduledPostId: v.id("scheduledPosts"),
    socialAccountId: v.id("socialAccounts"),
    caption: v.string(),
    mediaUrls: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      return await publishToTikTokLogic(ctx, args);
    } catch (error) {
      return handleError(ctx, error, "tiktok", args.scheduledPostId);
    }
  },
});

export const publishToInstagram = action({
  args: {
    scheduledPostId: v.id("scheduledPosts"),
    socialAccountId: v.id("socialAccounts"),
    caption: v.string(),
    mediaUrls: v.array(v.string()),
    mediaType: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      return await publishToInstagramLogic(ctx, args);
    } catch (error) {
      return handleError(ctx, error, "instagram", args.scheduledPostId);
    }
  },
});

export const publishToFacebook = action({
  args: {
    scheduledPostId: v.id("scheduledPosts"),
    socialAccountId: v.id("socialAccounts"),
    message: v.string(),
    mediaUrls: v.optional(v.array(v.string())),
    link: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      return await publishToFacebookLogic(ctx, args);
    } catch (error) {
      return handleError(ctx, error, "facebook", args.scheduledPostId);
    }
  },
});

export const publishToX = action({
  args: {
    scheduledPostId: v.id("scheduledPosts"),
    socialAccountId: v.id("socialAccounts"),
    text: v.string(),
    mediaUrls: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    try {
      return await publishToXLogic(ctx, args);
    } catch (error) {
      return handleError(ctx, error, "x", args.scheduledPostId);
    }
  },
});

export const publishToYouTube = action({
  args: {
    scheduledPostId: v.id("scheduledPosts"),
    socialAccountId: v.id("socialAccounts"),
    title: v.string(),
    description: v.string(),
    mediaUrl: v.string(),
    tags: v.optional(v.array(v.string())),
    categoryId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      return await publishToYouTubeLogic(ctx, args);
    } catch (error) {
      return handleError(ctx, error, "youtube", args.scheduledPostId);
    }
  },
});

export const publishToLinkedIn = action({
  args: {
    scheduledPostId: v.id("scheduledPosts"),
    socialAccountId: v.id("socialAccounts"),
    text: v.string(),
    mediaUrls: v.optional(v.array(v.string())),
    link: v.optional(v.string()),
    linkTitle: v.optional(v.string()),
    linkDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      return await publishToLinkedInLogic(ctx, args);
    } catch (error) {
      return handleError(ctx, error, "linkedin", args.scheduledPostId);
    }
  },
});

export const publishByPlatform = action({
  args: {
    scheduledPostId: v.id("scheduledPosts"),
  },
  handler: async (ctx, args) => {
    const post = await ctx.runQuery(api.scheduledPosts.get, {
      id: args.scheduledPostId,
    });
    if (!post) throw new Error("Scheduled post not found");

    const content = await ctx.runQuery(api.content.get, {
      id: post.contentId,
    });
    if (!content) throw new Error("Content not found");

    let platformVariant: { caption?: string; hashtags?: string[] } | undefined = undefined;
    if (post.platformVariantId) {
      platformVariant = await ctx.runQuery(
        api.contentPlatformVariants.get,
        { id: post.platformVariantId }
      );
    }

    const caption =
      platformVariant?.caption ?? content.description ?? content.title;
    const hashtags = platformVariant?.hashtags ?? [];
    const fullCaption = `${caption}\n\n${hashtags.map((h: string) => `#${h}`).join(" ")}`;

    try {
      switch (post.platform) {
        case "tiktok":
          return await publishToTikTokLogic(ctx, {
            scheduledPostId: args.scheduledPostId,
            socialAccountId: post.socialAccountId,
            caption: fullCaption,
            mediaUrls: [],
          });

        case "instagram":
          return await publishToInstagramLogic(ctx, {
            scheduledPostId: args.scheduledPostId,
            socialAccountId: post.socialAccountId,
            caption: fullCaption,
            mediaUrls: [],
            mediaType: content.contentType === "video" ? "VIDEO" : "IMAGE",
          });

        case "facebook":
          return await publishToFacebookLogic(ctx, {
            scheduledPostId: args.scheduledPostId,
            socialAccountId: post.socialAccountId,
            message: fullCaption,
            mediaUrls: [],
          });

        case "x":
          return await publishToXLogic(ctx, {
            scheduledPostId: args.scheduledPostId,
            socialAccountId: post.socialAccountId,
            text: fullCaption,
            mediaUrls: [],
          });

        case "youtube":
          return await publishToYouTubeLogic(ctx, {
            scheduledPostId: args.scheduledPostId,
            socialAccountId: post.socialAccountId,
            title: content.title,
            description: caption,
            mediaUrl: "",
            tags: hashtags,
          });

        case "linkedin":
          return await publishToLinkedInLogic(ctx, {
            scheduledPostId: args.scheduledPostId,
            socialAccountId: post.socialAccountId,
            text: caption,
            mediaUrls: [],
          });

        default:
          throw new Error(`Unsupported platform: ${post.platform}`);
      }
    } catch (error) {
      return handleError(ctx, error, post.platform, args.scheduledPostId);
    }
  },
});
