# Krivaten App

A personal tools PWA built with React, Hono, and Supabase. Deployed to Cloudflare Pages (frontend) and Cloudflare Workers (API).

## Tech Stack

| Layer           | Technology                                     |
| --------------- | ---------------------------------------------- |
| Frontend        | React 19, TypeScript, Vite, React Router 7     |
| Styling         | Tailwind CSS v4, shadcn/ui, Anton display font |
| Backend API     | Hono on Cloudflare Workers                     |
| Database        | Supabase (PostgreSQL with Row Level Security)  |
| Auth            | Supabase Auth (Google, GitHub, email/password) |
| PWA             | vite-plugin-pwa with Workbox service worker    |
| Package Manager | pnpm (workspace monorepo)                      |

## Project Structure

```
krivaten-app/
├── frontend/                # React SPA → Cloudflare Pages
│   ├── src/
│   │   ├── components/      # Logo, OAuthButtons, AvatarUpload
│   │   │   └── ui/          # shadcn/ui components
│   │   ├── contexts/        # AuthContext (session, OAuth, sign in/out)
│   │   ├── hooks/           # useProfile
│   │   ├── layouts/         # Authenticated + Unauthenticated layouts
│   │   ├── lib/             # supabase client, api client, utils
│   │   ├── pages/           # SignIn, SignUp, AuthCallback, Dashboard
│   │   │   └── profile/     # Profile editor
│   │   └── types/           # Profile types
│   ├── public/              # PWA icons, favicon, _redirects, _headers
│   └── vite.config.ts
├── workers/                 # Hono API → Cloudflare Workers
│   ├── src/
│   │   ├── routes/          # health, auth, profiles
│   │   ├── middleware/       # JWT auth middleware (jose)
│   │   ├── lib/             # Supabase client factory
│   │   └── types/           # Env bindings, User, Variables
│   └── wrangler.toml
├── supabase/
│   └── migrations/          # profiles table, avatars storage bucket
├── .env.example
├── package.json             # Root workspace scripts
└── pnpm-workspace.yaml
```

## Prerequisites

- Node.js 22 (see `.nvmrc`)
- pnpm
- A [Supabase](https://supabase.com) project
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for running migrations)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (installed as a dev dependency)

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Copy the example and fill in your Supabase credentials:

```bash
cp .env.example .env
```

**`.env`** (root — used by frontend via Vite):

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_KEY=your-anon-key
VITE_API_URL=http://localhost:8787
```

**`workers/.dev.vars`** (used by Wrangler for local dev):

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_JWT_SECRET=your-jwt-secret
FRONTEND_URL=http://localhost:5173
```

The JWT secret is found in Supabase Dashboard → Settings → API → JWT Secret.

### 3. Run database migrations

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

This creates:

- `profiles` table with auto-create trigger on user signup, RLS policies
- `avatars` storage bucket with per-user upload policies

### 4. Configure Supabase Auth providers

In Supabase Dashboard → Authentication → Providers:

- Enable **Google** (requires Google Cloud OAuth credentials)
- Enable **GitHub** (requires GitHub OAuth App)
- Set **Site URL** to `http://localhost:5173` (or your production URL)
- Add **Redirect URLs**: `http://localhost:5173/auth/callback`

### 5. Start development

```bash
pnpm dev
```

This starts both servers concurrently:

- Frontend: http://localhost:5173
- Workers API: http://localhost:8787

## Commands

| Command               | Description                           |
| --------------------- | ------------------------------------- |
| `pnpm dev`            | Start frontend + workers concurrently |
| `pnpm frontend`       | Start frontend dev server only        |
| `pnpm workers`        | Start workers dev server only         |
| `pnpm build`          | Build frontend for production         |
| `pnpm deploy:workers` | Deploy workers to Cloudflare          |
| `pnpm typecheck`      | Type-check workers                    |

## API Endpoints

| Method | Endpoint           | Auth     | Description        |
| ------ | ------------------ | -------- | ------------------ |
| GET    | `/`                | No       | Welcome message    |
| GET    | `/api/health`      | No       | Health check       |
| GET    | `/api/auth/me`     | Required | Current user info  |
| GET    | `/api/profiles/me` | Required | Get own profile    |
| PUT    | `/api/profiles/me` | Required | Update own profile |

Authenticated endpoints require an `Authorization: Bearer <token>` header with a valid Supabase JWT.

## Deployment

### Workers (API)

Set production secrets:

```bash
cd workers
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_KEY
npx wrangler secret put SUPABASE_JWT_SECRET
npx wrangler secret put FRONTEND_URL    # e.g. https://app.krivaten.com
```

Deploy:

```bash
pnpm deploy:workers
```

### Frontend (Cloudflare Pages)

**Option A — Git integration:**

1. Push repo to GitHub
2. Cloudflare Dashboard → Pages → Create project → Connect to Git
3. Build settings:
   - Build command: `cd frontend && pnpm install && pnpm build`
   - Build output directory: `frontend/dist`
   - Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`, `VITE_API_URL`, `NODE_VERSION=22`

**Option B — Manual deploy:**

```bash
pnpm build
cd frontend && npx wrangler pages deploy dist --project-name=krivaten-app
```

### Custom Domain

In Cloudflare Pages project → Custom domains → Add `app.krivaten.com`.

Update Supabase redirect URLs to include the production callback:

- `https://app.krivaten.com/auth/callback`

## Database

Migrations live in `supabase/migrations/`. Key tables:

- **`profiles`** — User profile data (display_name, avatar_url, bio). Auto-created on signup via trigger. RLS ensures users can only read/update their own profile.
- **`avatars` bucket** — Supabase Storage bucket for avatar images. Public read, per-user write.
