import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    status: v.optional(v.string()),
    jobType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    if (args.status) {
      return await ctx.db
        .query("jobs")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(limit);
    }

    if (args.jobType) {
      return await ctx.db
        .query("jobs")
        .withIndex("by_type", (q) => q.eq("jobType", args.jobType!))
        .order("desc")
        .take(limit);
    }

    return await ctx.db.query("jobs").order("desc").take(limit);
  },
});

export const get = query({
  args: { id: v.id("jobs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    jobType: v.string(),
    jobKey: v.string(),
    idempotencyKey: v.string(),
    payload: v.optional(v.any()),
    maxAttempts: v.optional(v.number()),
    nextRunAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("jobs")
      .withIndex("by_idempotency", (q) =>
        q.eq("idempotencyKey", args.idempotencyKey)
      )
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("jobs", {
      ...args,
      status: "PENDING",
      result: undefined,
      error: undefined,
      attempts: 0,
      maxAttempts: args.maxAttempts ?? 3,
      nextRunAt: args.nextRunAt,
      lockedAt: undefined,
      completedAt: undefined,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("jobs"),
    payload: v.optional(v.any()),
    nextRunAt: v.optional(v.number()),
    maxAttempts: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined)
    );
    await ctx.db.patch(id, filtered);
    return id;
  },
});

export const lock = mutation({
  args: { id: v.id("jobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.id);
    if (!job) throw new Error("Job not found");
    if (job.lockedAt) throw new Error("Job already locked");

    await ctx.db.patch(args.id, {
      lockedAt: Date.now(),
      status: "RUNNING",
      attempts: job.attempts + 1,
    });
    return args.id;
  },
});

export const unlock = mutation({
  args: { id: v.id("jobs") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      lockedAt: undefined,
      status: "PENDING",
    });
    return args.id;
  },
});

export const getNextJob = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    const now = Date.now();
    const pending = await ctx.db
      .query("jobs")
      .withIndex("by_status", (q) => q.eq("status", "PENDING"))
      .order("asc")
      .take(limit * 2);

    return pending
      .filter((job) => !job.nextRunAt || job.nextRunAt <= now)
      .slice(0, limit);
  },
});

export const markCompleted = mutation({
  args: {
    id: v.id("jobs"),
    result: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "COMPLETED",
      result: args.result,
      lockedAt: undefined,
      completedAt: Date.now(),
    });
    return args.id;
  },
});

export const markFailed = mutation({
  args: {
    id: v.id("jobs"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.id);
    if (!job) throw new Error("Job not found");

    const shouldRetry = job.attempts < job.maxAttempts;

    await ctx.db.patch(args.id, {
      status: shouldRetry ? "PENDING" : "FAILED",
      error: args.error,
      lockedAt: undefined,
      nextRunAt: shouldRetry
        ? Date.now() + Math.pow(2, job.attempts) * 60000
        : undefined,
    });
    return args.id;
  },
});
