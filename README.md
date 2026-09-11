# Content OS IA

An intelligent social media automation platform powered by AI. Schedule, publish, and manage content across TikTok, Instagram, Facebook, X (Twitter), YouTube, and LinkedIn with AI-generated content, smart scheduling, and analytics.

## Features

- **Multi-Platform Publishing** - Publish to 6 social platforms from a single dashboard
- **AI Content Generation** - Generate captions, hashtags, and content variants using Gemini
- **Smart Scheduling** - Best-time optimization based on audience engagement patterns
- **Content Scoring** - AI-powered content quality scoring with detailed breakdowns
- **Analytics Dashboard** - Unified analytics across all connected platforms
- **Campaign Management** - Organize content into campaigns with objectives and budgets

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Database | Convex |
| AI | Gemini 2.0 Flash |
| UI | Tailwind CSS 4, shadcn/ui |
| Validation | Zod, React Hook Form |
| Deployment | Netlify |

## Prerequisites

- Node.js 20+
- npm
- Convex account (free tier works)
- AI API key (for AI features)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Convex

1. Create a free account at [convex.dev](https://convex.dev)
2. Create a new project
3. Run `npx convex dev` to initialize the schema
4. Copy your deployment URL

### 3. Configure environment

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

Set `NEXT_PUBLIC_CONVEX_URL` to your Convex deployment URL.

### 4. Run locally

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_CONVEX_URL` | Yes | Convex deployment URL |
| `AI_API_KEY` | No | API key for AI generation (Gemini) |
| `AI_MODEL` | No | AI model to use (default: gemini-2.0-flash) |
| `SOCIAL_MOCK_MODE` | No | `true` for testing without real APIs |
| `APP_URL` | No | App base URL (default: http://localhost:3000) |
| `ENABLE_TIKTOK` | No | Enable TikTok publishing (default: true) |
| `ENABLE_INSTAGRAM` | No | Enable Instagram publishing (default: true) |
| `ENABLE_FACEBOOK` | No | Enable Facebook publishing (default: true) |
| `ENABLE_X` | No | Enable X/Twitter publishing (default: true) |
| `ENABLE_YOUTUBE` | No | Enable YouTube publishing (default: true) |
| `ENABLE_LINKEDIN` | No | Enable LinkedIn publishing (default: true) |
| `ENABLE_AUTOPILOT` | No | Enable autopilot mode (default: true) |

## Deploy to Netlify

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Connect to Netlify

1. Go to [app.netlify.com](https://app.netlify.com)
2. Click "Add new site" > "Import an existing project"
3. Select your GitHub repository
4. Netlify will auto-detect the Next.js build settings from `netlify.toml`
5. Click "Deploy site"

### 3. Configure environment variables in Netlify

Go to Site settings > Environment variables and add:

- `NEXT_PUBLIC_CONVEX_URL` - Your Convex deployment URL
- `AI_API_KEY` - Your AI API key
- `SOCIAL_MOCK_MODE` - Set to `false` for production
- `APP_URL` - Your Netlify site URL

### 4. Post-deployment

- Update OAuth redirect URIs for all social platforms to use your Netlify domain
- Set `SOCIAL_MOCK_MODE=false` to enable real API integrations
- Configure `APP_URL` to your production domain

## Project Structure

```
autopublicador/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── api/          # API routes
│   │   ├── (auth)/       # Auth pages
│   │   └── (dashboard)/  # Dashboard pages
│   ├── components/       # React components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Core business logic
│   └── types/            # TypeScript types
├── convex/               # Convex schema and functions
├── netlify.toml          # Netlify configuration
└── package.json
```

## License

MIT
