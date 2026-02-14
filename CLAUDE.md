# CLAUDE.md

## Project Overview

Sondering is a personal tools PWA with:
- **Frontend**: Vite + React + TypeScript + React Router + Tailwind CSS v4 + shadcn/ui → Cloudflare Pages
- **Backend**: Hono (TypeScript) on Cloudflare Workers
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth (Google, GitHub, email/password)
- **Package Manager**: pnpm (workspace monorepo)

## Project Structure

```
sondering/
├── frontend/          # React SPA → Cloudflare Pages (port 5173)
├── workers/           # Hono API → Cloudflare Workers (port 8787)
├── supabase/          # Database migrations
├── package.json       # Root scripts
└── pnpm-workspace.yaml
```

## Commands

- `pnpm dev` — Start frontend + workers concurrently
- `pnpm frontend` — Frontend only
- `pnpm workers` — Workers only
- `pnpm build` — Build frontend for production
- `pnpm deploy:workers` — Deploy workers to Cloudflare

## Environment Variables

**Frontend (.env):** VITE_SUPABASE_URL, VITE_SUPABASE_KEY, VITE_API_URL
**Workers (.dev.vars):** SUPABASE_URL, SUPABASE_KEY, SUPABASE_JWT_SECRET, FRONTEND_URL
