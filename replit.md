# Workspace

## Overview

**RepoBoost** — Transforma repositórios GitHub em autoridade no LinkedIn usando IA.
Converte código em READMEs profissionais + posts técnicos para LinkedIn via OpenAI GPT.

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: OpenAI GPT-5.2 via Replit AI Integrations (no user API key needed)
- **Auth**: GitHub OAuth 2.0 (session-based with connect-pg-simple)
- **Sessions**: express-session + PostgreSQL store

## App Features

- Landing page with pricing and CTA
- GitHub OAuth login (1-click)
- Dashboard showing user's public repos
- AI generates README.md + 4 LinkedIn posts per repo
- Credit system: 1 free credit on signup, buy packs: 10/25/50 créditos
- History page for past generations
- Result page with rendered markdown + copy-to-clipboard LinkedIn posts

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── repoboost/          # React + Vite frontend (at /)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle ORM schema + DB connection
│   └── integrations-openai-ai-server/  # OpenAI client (Replit AI Integrations)
├── scripts/                # Utility scripts (single workspace package)
├── pnpm-workspace.yaml     # pnpm workspace
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## Database Schema

### `users` table
- id, github_id (unique), username, email, avatar_url, access_token, credits (default 1), created_at, updated_at

### `generations` table
- id, user_id (FK), repo_name, repo_full_name, repo_description, repo_language, readme (text), linkedin_posts (jsonb), created_at

## Environment Variables Required

- `GITHUB_CLIENT_ID` — GitHub OAuth App Client ID (secret)
- `GITHUB_CLIENT_SECRET` — GitHub OAuth App Client Secret (secret)
- `SESSION_SECRET` — Session encryption key (already set)
- `AI_INTEGRATIONS_OPENAI_BASE_URL` — Auto-set by Replit AI Integrations
- `AI_INTEGRATIONS_OPENAI_API_KEY` — Auto-set by Replit AI Integrations
- `STRIPE_SECRET_KEY` — (optional) For Stripe payment integration
- `STRIPE_WEBHOOK_SECRET` — (optional) For Stripe webhooks
- `APP_URL` — (optional) Base URL for OAuth callback, defaults to http://localhost:80

## GitHub OAuth Setup

1. Go to https://github.com/settings/applications/new
2. Set "Homepage URL" to your app URL
3. Set "Authorization callback URL" to `https://your-app.replit.app/api/auth/github/callback`
4. Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET as secrets in Replit

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes in `src/routes/`.

Key routes:
- `GET /api/auth/github` — Initiate GitHub OAuth
- `GET /api/auth/github/callback` — OAuth callback, sets session
- `GET /api/auth/me` — Current user (requires session)
- `POST /api/auth/logout` — Destroy session
- `GET /api/repos` — List user's GitHub repos
- `POST /api/generate` — Generate README + LinkedIn posts (costs 1 credit)
- `GET /api/generations` — History of past generations
- `GET /api/generations/:id` — Single generation
- `GET /api/credits` — Current credit balance
- `POST /api/credits/checkout` — Create Stripe checkout session
- `POST /api/webhooks/stripe` — Stripe webhook (adds credits on payment)

### `artifacts/repoboost` (`@workspace/repoboost`)

React + Vite frontend at `/`. Pages: LandingPage, DashboardPage, ResultPage, HistoryPage.

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.

### `lib/integrations-openai-ai-server` (`@workspace/integrations-openai-ai-server`)

OpenAI client using Replit AI Integrations. No user API key required.
