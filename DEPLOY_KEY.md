# CONVEX DEPLOY - KEY REQUIRED

## The deploy needs a CONVEX_DEPLOY_KEY

To get the deploy key:

1. Go to https://dashboard.convex.dev/
2. Select your project: "fine-owl-595"
3. Go to Settings > Deployment Keys
4. Copy the "Production Deploy Key"

Then either:

## Option A: Set environment variable
```bash
$env:CONVEX_DEPLOY_KEY = "YOUR_KEY_HERE"
npx convex deploy
```

## Option B: Create .env.local entry
Add to .env.local:
```
CONVEX_DEPLOY_KEY=YOUR_KEY_HERE
```

Then run:
```bash
npx convex deploy
```

## What this deploys
- convex/auth.ts (register, login)
- convex/strategyMemory.ts
- convex/contentPieces.ts
- convex/campaigns.ts
- All modules

After deploy, the auth:login error will be fixed.
