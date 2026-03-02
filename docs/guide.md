# Krivaten Developer Guide

## Overview

Krivaten is a Universal Observation Database — a tracker-based platform for tracking entities (things), relationships (connections), and observations (structured measurements) across any domain.

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
pnpm test:workers     # Run 72 integration tests (requires supabase start)
pnpm deploy:workers   # Deploy workers to Cloudflare
```

## Data Model

### Core Concepts

- **Tenants** — Multi-tenant spaces. Each user belongs to one or more tenants via `tenant_members`.
- **Entity Types** — System-defined categories (person, plant, animal, location, project, equipment, supply, process). Stored in the `entity_types` table.
- **Entities** — Things being tracked. Each has an `entity_type_id` FK to `entity_types`.
- **Trackers** — Observation templates with structured fields (mood, growth, health, harvest, etc.). Each tracker defines typed fields via `tracker_fields`.
- **Relationships** — Directed connections between entities with plain text `type` (located_in, manages, part_of, etc.) and optional temporal validity.
- **Observations** — Structured measurements stored as JSONB `field_values` keyed by tracker field codes.

### How Trackers Work

Trackers define what data you can record about an entity. Each tracker has a set of typed fields:

```
Tracker: "mood"
├── mood (single_select: very_low, low, neutral, good, very_good)
├── energy (single_select: very_low, low, moderate, high, very_high)
├── triggers (textarea)
└── notes (textarea)
```

Field types: `text`, `number`, `boolean`, `single_select`, `multi_select`, `textarea`, `datetime`

Each entity type has default tracker assignments:

| Entity Type | Default Trackers |
|-------------|-----------------|
| person | behavior, diet, sleep, health, mood |
| plant | soil, health, growth, harvest |
| animal | health, diet, behavior, growth |
| location | weather, conditions |
| project | status, milestones |
| equipment | maintenance, condition |
| supply | inventory, usage |
| process | execution, quality |

Individual entities can override these defaults — enable additional trackers or disable ones they don't need.

### Multi-Tenant Design

Users are linked to tenants via the `tenant_members` join table:

```
auth.users ──▶ profiles (1:1, auto-created)
auth.users ──▶ tenant_members ──▶ tenants (many-to-many)
```

- Each membership has a `role` (admin, member) and `is_active` flag
- Only one membership can be active per user (enforced by partial unique index)
- `get_my_tenant_id()` returns the active tenant for RLS policies
- All data tables (entities, relationships, observations, etc.) are scoped to `tenant_id = get_my_tenant_id()`

### Observation Values

Observations store structured data in a JSONB `field_values` column, keyed by tracker field codes:

```json
{
  "mood": "good",
  "energy": "high",
  "triggers": "Exercise in the morning",
  "notes": "Great day overall"
}
```

The API validates that all required fields (defined in `tracker_fields` with `is_required = true`) are present before inserting.

## Auth & Profile Flow

### How It Works

1. User signs in via Supabase Auth (Google, GitHub, or email/password)
2. `handle_new_user` trigger creates a profile row on signup
3. Frontend calls `GET /profiles/me` which triggers `ensureProfile` — a safety net if the trigger didn't fire
4. If user has no tenant, frontend shows space creation UI
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
| POST | `/tenants` | Create space |
| GET | `/tenants/mine` | Get current space |
| PUT | `/tenants/mine` | Update space |
| GET | `/profiles/me` | Get/ensure current profile |
| PUT | `/profiles/me` | Update profile |
| GET | `/entity-types` | List entity types (optional `?code=` filter) |
| GET | `/entity-types/:id` | Entity type with default trackers |
| GET | `/trackers` | List trackers (optional `?entity_type=` filter) |
| GET | `/trackers/:id` | Tracker with fields |
| GET/POST/PUT/DELETE | `/entities` | Entity CRUD (DELETE = soft-delete) |
| GET | `/entities/:id/trackers` | Entity's effective trackers |
| PUT | `/entities/:id/trackers` | Toggle entity tracker overrides |
| GET | `/entities/:id/relationships` | Entity's relationships |
| GET | `/entities/:id/related` | Graph traversal (RPC) |
| GET/POST/DELETE | `/relationships` | Relationship CRUD |
| GET/POST/DELETE | `/observations` | Metrics (observation CRUD) with pagination |
| GET | `/observations/:id` | Single metric with joins |
| POST | `/observations/batch` | Batch create metrics |
| GET | `/search/entities?q=` | Entity name search |
| GET | `/search/taxonomy?path=` | Taxonomy prefix search |

### Code Resolution

The API accepts both UUIDs and string codes for lookups:
- Entities: `entity_type_id` (UUID) or `entity_type` (code string, resolved via `entity_types` table)
- Observations: `tracker_id` (UUID) or `tracker` (code string, resolved via `trackers` table)

## Use Cases

### Example 1: Family Health Tracking

A parent wants to track their child's daily health, mood, and behavior.

**Setup:**
1. Create a space called "Our Family"
2. Add a "person" entity for each family member

**Daily workflow:**

```bash
# Create the entity
POST /api/v1/entities
{ "entity_type": "person", "name": "Emma" }

# Log a mood observation
POST /api/v1/observations
{
  "entity_id": "<emma-id>",
  "tracker": "mood",
  "field_values": { "mood": "good", "energy": "high" },
  "notes": "Had a great day at school"
}

# Log a sleep observation
POST /api/v1/observations
{
  "entity_id": "<emma-id>",
  "tracker": "sleep",
  "field_values": {
    "bedtime": "2026-02-27T20:30:00",
    "wake_time": "2026-02-28T06:45:00",
    "quality": "good",
    "duration_hours": 10.25
  }
}

# Log a behavior incident
POST /api/v1/observations
{
  "entity_id": "<emma-id>",
  "tracker": "behavior",
  "field_values": {
    "type": ["hitting", "screaming"],
    "intensity": "moderate",
    "duration_minutes": 15,
    "triggers": "Didn't want to leave the playground"
  }
}

# View recent observations for Emma
GET /api/v1/observations?entity_id=<emma-id>&page=1&per_page=20
```

The parent can filter by tracker to see just sleep data over time, or view everything on the timeline. The `behavior` tracker captures structured incident data — type, intensity, duration, triggers — making it easy to spot patterns.

### Example 2: Garden & Homestead Management

A gardener tracks their plants, growing conditions, and harvests across multiple garden beds.

**Setup:**

```bash
# Create location entities for garden areas
POST /api/v1/entities
{ "entity_type": "location", "name": "Raised Bed A" }

POST /api/v1/entities
{ "entity_type": "location", "name": "Greenhouse" }

# Create plant entities
POST /api/v1/entities
{
  "entity_type": "plant",
  "name": "Roma Tomato #1",
  "taxonomy_path": "biology.botany.solanaceae",
  "attributes": { "variety": "Roma VF", "planted_date": "2026-03-01" }
}

POST /api/v1/entities
{ "entity_type": "plant", "name": "Basil - Genovese" }

# Connect plants to their locations
POST /api/v1/relationships
{
  "source_id": "<tomato-id>",
  "target_id": "<raised-bed-a-id>",
  "type": "located_in"
}
```

**Weekly observations:**

```bash
# Track plant growth
POST /api/v1/observations
{
  "entity_id": "<tomato-id>",
  "tracker": "growth",
  "field_values": {
    "height_cm": 45,
    "width_cm": 30,
    "leaf_count": 22,
    "stage": "flowering"
  }
}

# Track soil conditions for the bed
POST /api/v1/observations
{
  "entity_id": "<raised-bed-a-id>",
  "tracker": "conditions",
  "field_values": {
    "temperature_c": 24,
    "humidity_percent": 65,
    "light_level": "bright"
  }
}

# Log a harvest
POST /api/v1/observations
{
  "entity_id": "<tomato-id>",
  "tracker": "harvest",
  "field_values": {
    "quantity": 2.5,
    "unit": "kg",
    "quality_rating": "excellent"
  },
  "notes": "First big harvest of the season!"
}

# Batch log growth for multiple plants at once
POST /api/v1/observations/batch
{
  "observations": [
    {
      "entity_id": "<tomato-id>",
      "tracker": "growth",
      "field_values": { "height_cm": 48, "stage": "fruiting" }
    },
    {
      "entity_id": "<basil-id>",
      "tracker": "growth",
      "field_values": { "height_cm": 25, "stage": "vegetative" }
    }
  ]
}

# Find all plants in the botany taxonomy
GET /api/v1/search/taxonomy?path=biology.botany

# See what's connected to Raised Bed A
GET /api/v1/entities/<raised-bed-a-id>/related
```

The gardener can also enable the `health` tracker on their plant entities to track pest or disease issues, or disable the `soil` tracker on plants where they track soil at the location level instead.

**Customizing trackers per entity:**

```bash
# See what trackers are active for the tomato plant
GET /api/v1/entities/<tomato-id>/trackers
# Returns: soil, health, growth, harvest (defaults for plant type)

# Disable soil tracking on this plant (tracked at bed level instead)
# and enable the weather tracker for outdoor plants
PUT /api/v1/entities/<tomato-id>/trackers
[
  { "tracker_id": "<soil-tracker-id>", "is_enabled": false },
  { "tracker_id": "<weather-tracker-id>", "is_enabled": true }
]
```

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

### TanStack Query Hooks

All data fetching uses TanStack Query v5:

- `useEntityTypes()` — list all entity types
- `useTrackers(entityType?)` — list trackers, optionally filtered by entity type code
- `useTracker(id)` — single tracker with fields
- `useEntityTrackers(entityId)` — effective trackers for an entity (defaults + overrides)
- `useEntities(filters?)` — list entities with type/search/active filters
- `useRelationships(entityId?)` — list relationships for an entity
- `useObservations(filters?)` — paginated observations with entity_id/tracker/date filters

### UI Components

Built on shadcn/ui with Radix primitives:
- **Combobox** — searchable select (Popover + Command/cmdk)
- **TrackerFieldInput** — renders the right input control for each tracker field type
- **ObservationForm** — entity selector → tracker selector → dynamic fields → submit
- **QuickLog** — compact form showing only required fields for fast entry
- **BatchObservationForm** — pick a tracker, then add rows of entity + field values
- **Timeline** — observation history with field values, tracker badges, delete + attribution
- **EntityForm** — create/edit mode via optional `entity` prop
- **RelationshipForm** — source (read-only) + type selector + target combobox

## Testing

### Architecture

- Real Supabase auth JWTs (not mocks) — tests create users via admin API
- Tests invoke Hono app directly via `app.request()` — no HTTP server
- Cleanup via service role client (bypasses RLS)
- FK-safe cleanup order: audit_log → observations → entity_trackers → relationships → entities → tenant_members → profiles → tenants → auth users

### Key Helpers

- `setupUserWithTenant(prefix?, name?)` — creates user + profile + tenant in one call
- `getEntityTypeId(user, code)` — resolves entity type UUID by code
- `getTrackerId(user, code)` — resolves tracker UUID by code
- `createEntityForUser(user, data)` — creates entity for user with tenant
- `createObservationForUser(user, data)` — creates observation with `{ entity_id, tracker, field_values }`
- `createRelationshipForUser(user, data)` — creates relationship with `{ source_id, target_id, type }`

## Database Migrations

Migrations live in `supabase/migrations/`.

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
