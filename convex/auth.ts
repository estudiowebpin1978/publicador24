import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function hashPassword(password: string, salt: string): string {
  // Use Web Crypto API (available in all Convex runtimes)
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  // For synchronous hash, we use a simple approach with btoa
  // Note: This is a basic hash, not cryptographically secure
  // For production, use Convex actions with proper crypto
  const hash = btoa(String.fromCharCode(...new Uint8Array(data)));
  return hash.substring(0, 32); // Truncate for storage
}

function generateToken(): string {
  // Generate a random token using Math.random for simplicity
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
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

    const salt = Math.random().toString(36).substring(2, 18);
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
