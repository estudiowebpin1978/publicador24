# FIX: Convex auth:login not found

## Problem
The Convex server (`fine-owl-595`) doesn't have the `auth:login` function deployed.
The function exists in `convex/auth.ts` but needs to be pushed.

## Solution
Run these commands:

```bash
# 1. Install Convex CLI (if not installed)
npm install -g convex

# 2. Login to Convex (if needed)
npx convex login

# 3. Deploy all functions
npx convex deploy
```

## What gets deployed
- `convex/auth.ts` - register, login, getByEmail, list
- `convex/strategyMemory.ts` - getByCampaign, create, updateScore, list
- `convex/contentPieces.ts` - getById, getByCampaign
- `convex/campaigns.ts` - create, update, list
- All other Convex modules

After deploy, the login/register pages at `/login` and `/register` will work.
