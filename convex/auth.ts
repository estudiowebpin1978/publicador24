import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { createHash, randomBytes } from "crypto";

function hashPassword(password: string, salt: string): string {
  return createHash("sha256")
    .update(password + salt)
    .digest("hex");
}

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export const register = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.password.length < 6) {
      throw new Error("La contraseña debe tener al menos 6 caracteres");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      throw new Error("Ya existe una cuenta con ese email");
    }

    const salt = randomBytes(16).toString("hex");
    const passwordHash = hashPassword(args.password, salt);

    const userId = await ctx.db.insert("users", {
      email: args.email,
      passwordHash,
      salt,
      name: args.name,
      createdAt: Date.now(),
    });

    const token = generateToken();

    return { userId, token, email: args.email, name: args.name };
  },
});

export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error("Email o contraseña incorrectos");
    }

    const passwordHash = hashPassword(args.password, user.salt);
    if (passwordHash !== user.passwordHash) {
      throw new Error("Email o contraseña incorrectos");
    }

    const token = generateToken();

    return { userId: user._id, token, email: user.email, name: user.name };
  },
});

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) return null;

    return {
      _id: user._id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map((u) => ({
      _id: u._id,
      email: u.email,
      name: u.name,
      createdAt: u.createdAt,
    }));
  },
});
