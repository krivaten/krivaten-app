# Krivaten Developer Guide

## Overview

Krivaten is a Universal Observation Database — a vocabulary-driven platform for tracking entities (things), edges (relationships), and observations (measurements) across any domain.

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Frontend    │────▶│  Workers (API)   │────▶│  Supabase (DB)   │
│  React SPA   │     │  Hono on CF      │     │  PostgreSQL +    │
│  CF Pages    │     │  Workers         │     │  Auth + RLS      │
└─────────────┘     └──────────────────┘     └──────────────────┘
```

- **Frontend**: Vite + React + TypeScript + Tailwind CSS v4 + shadcn/ui, deployed to Cloudflare Pages
- **Backend**: Hono TypeScript API on Cloudflare Workers
- **Database**: Supabase (PostgreSQL with PostGIS, pgcrypto, Row Level Security)
- **Auth**: Supabase Auth (Google, GitHub, email/password)
- **Monorepo**: pnpm workspaces (`frontend/`, `workers/`, `supabase/`)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Docker (for local Supabase)
- Supabase CLI

### Setup

```bash
pnpm install
cp .env.example .env          # Configure Supabase credentials
cp workers/.dev.vars.example workers/.dev.vars
supabase start                # Start local Supabase (for tests)
pnpm dev                      # Start frontend + workers
```

### Common Commands

```bash
pnpm dev              # Start everything (frontend :5173, workers :8787)
pnpm frontend         # Frontend only
pnpm workers          # Workers only
pnpm build            # Production build
pnpm test:workers     # Run 61 integration tests (requires supabase start)
pnpm deploy:workers   # Deploy workers to Cloudflare
```

## Data Model

### Core Concepts

- **Tenants** — Multi-tenant workspaces. Each user belongs to one or more tenants via `tenant_members`.
- **Entities** — Things being tracked (people, locations, plants, equipment, etc.). Types are vocabulary-driven.
- **Edges** — Directed relationships between entities with temporal validity.
- **Observations** — Immutable measurements with polymorphic values (numeric, text, boolean, JSON).
- **Vocabularies** — Controlled terms for entity types, variables, units, edge types, methods, quality flags.

### Multi-Tenant Design

Users are linked to tenants via the `tenant_members` join table:

```
auth.users ──▶ profiles (1:1, auto-created)
auth.users ──▶ tenant_members ──▶ tenants (many-to-many)
```

- Each membership has a `role` (admin, member) and `is_active` flag
- Only one membership can be active per user (enforced by partial unique index)
- `get_my_tenant_id()` returns the active tenant for RLS policies
- All data tables (entities, edges, observations, etc.) are scoped to `tenant_id = get_my_tenant_id()`

### Entity Type System

Entity types are vocabulary-driven — no hardcoded constraints. The `entity_type_id` column is a FK to vocabularies where `vocabulary_type = 'entity_type'`. System seed data provides 8 default types: person, location, plant, animal, project, equipment, supply, process. New types are created by adding vocabulary entries.

### Observation Values

Observations use polymorphic value columns — only one is populated per observation:

| Column | Type | Use Case |
|--------|------|----------|
| `value_numeric` | DOUBLE PRECISION | Measurements, counts |
| `value_text` | TEXT | Notes, labels |
| `value_boolean` | BOOLEAN | Yes/no flags |
| `value_json` | JSONB | Structured data |

## Auth & Profile Flow

### How It Works

1. User signs in via Supabase Auth (Google, GitHub, or email/password)
2. `handle_new_user` trigger creates a profile row on signup
3. Frontend calls `GET /profiles/me` which triggers `ensureProfile` — a safety net if the trigger didn't fire
4. If user has no tenant, frontend shows workspace creation UI
5. `POST /tenants` creates a tenant + `tenant_members` row (admin, active)
6. All subsequent API calls are scoped to the active tenant via RLS

### Stale JWT Handling

When a user is deleted but their JWT is still cached:
- `ensureProfile` tries to INSERT a profile, gets FK violation (code `23503`)
- Returns `null` → API responds with 401
- Frontend 401 interceptor signs out and redirects to `/signin`

## API

All endpoints under `/api/v1/`. Authentication via `Authorization: Bearer <supabase_access_token>`.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/tenants` | Create workspace |
| GET | `/tenants/mine` | Get current workspace |
| PUT | `/tenants/mine` | Update workspace |
| GET | `/profiles/me` | Get/ensure current profile |
| PUT | `/profiles/me` | Update profile |
| GET/POST/PUT/DELETE | `/vocabularies` | Vocabulary CRUD |
| GET/POST/PUT/DELETE | `/entities` | Entity CRUD (DELETE = soft-delete) |
| GET | `/entities/:id/edges` | Entity's edges |
| GET | `/entities/:id/timeseries` | Time-series data (RPC) |
| GET | `/entities/:id/related` | Graph traversal (RPC) |
| GET/POST/DELETE | `/edges` | Edge CRUD |
| GET/POST/DELETE | `/observations` | Observation CRUD |
| POST | `/observations/batch` | Batch create observations |
| GET | `/search/entities?q=` | Entity name search |
| GET | `/search/taxonomy?path=` | Taxonomy prefix search |

### Vocabulary Code Resolution

The API accepts both UUIDs and codes for vocabulary references:
- Entities: `entity_type_id` (UUID) or `entity_type` (code string)
- Observations: `variable_id` (UUID) or `variable` (code string)

The API resolves codes to UUIDs internally.

## Frontend Patterns

### State Management

Hooks use `State` enum from `frontend/src/lib/state.ts` instead of boolean flags:

```
INITIAL → PENDING → NONE / ONE / SOME / MANY / ERROR
```

- `getCollectionState(items[])` — NONE/ONE/SOME/MANY (threshold = 10)
- `getSingleState(item)` — NONE or ONE
- Auth context uses boolean `loading` (binary gate, not data-fetching)
- Mutations use local `saving` boolean

### API Client

`ApiClient` in `frontend/src/lib/api.ts`:
- Auto-attaches Supabase auth headers
- 401 interceptor: signs out + redirects to `/signin`
- Error format: `"<status>: <detail>"` (reads `{ detail }` from response body)

### UI Components

Built on shadcn/ui with Radix primitives:
- **Combobox** — searchable select (Popover + Command/cmdk)
- **EntityForm** — create/edit mode via optional `entity` prop
- **Timeline** — observation history with optional delete + attribution
- **BatchObservationForm** — dynamic rows, posts to batch endpoint

## Testing

### Architecture

- Real Supabase auth JWTs (not mocks) — tests create users via admin API
- Tests invoke Hono app directly via `app.request()` — no HTTP server
- Cleanup via service role client (bypasses RLS)
- FK-safe cleanup order: audit_log → observations → edges → entities → vocabularies (non-system) → tenant_members → profiles → tenants → auth users

### Key Helpers

- `setupUserWithTenant(prefix?, name?)` — creates user + profile + tenant in one call
- `getSystemVocabId(user, type, code)` — resolves system vocabulary UUID by type/code
- `createEntityForUser(user, data)` — creates entity for user with tenant
- `createObservationForUser(user, data)` — creates observation
- `createEdgeForUser(user, data)` — creates edge

## Database Migrations

Migrations live in `supabase/migrations/` and are numbered `20260221000000` through `20260221000010`.

### Deploying to Hosted Supabase

```bash
supabase db push              # Apply pending migrations
supabase db push --dry-run    # Preview changes
supabase db reset --linked    # Full reset (drop + reapply all migrations + seed)
```

### Idempotency

- Use `CREATE TABLE IF NOT EXISTS` for tables
- Use `INSERT ... ON CONFLICT DO NOTHING` for seed-like inserts
- Use `DROP POLICY IF EXISTS` before `CREATE POLICY` for re-runnable policies
