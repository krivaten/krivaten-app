# Multi-Tenant Schema + Reliable Profile Creation — COMPLETED

**Status:** Implemented and verified
**Branch:** `feature/multi-tenant-schema`

## What Changed

### Database
- Removed `tenant_id` and `role` columns from `profiles` table
- Added `tenant_members` join table (user_id, tenant_id, role, is_active) with partial unique index enforcing one active membership per user
- Updated `get_my_tenant_id()` to query `tenant_members` instead of `profiles`
- Updated RLS policies: tenant_members has own policies, profiles SELECT policy uses EXISTS on tenant_members

### Backend
- Created `ensureProfile` helper (`workers/src/lib/profile.ts`) — SELECT-or-INSERT with stale JWT detection via FK violation (code 23503)
- Updated `getTenantId` (`workers/src/lib/tenant.ts`) — queries `tenant_members` instead of `profiles`
- Updated `POST /api/v1/tenants` — uses `ensureProfile`, creates `tenant_members` row instead of updating `profiles.tenant_id`
- Updated `GET /api/v1/profiles/me` — uses `ensureProfile`, removed PGRST116 inline fallback

### Tests
- Added `tenant_members` to cleanup order in `cleanupAllData()`
- Added test: "creates a tenant without explicit profile/me call"
- Added test: "returns 401 for stale JWT (deleted user)"
- All 61 tests pass

### Frontend
- Removed `tenant_id` and `role` from `Profile` type
- Added 401 interceptor to `ApiClient.request()` and `ApiClient.delete()` — signs out and redirects to /signin
- `useTenant` hook calls `GET /profiles/me` before `GET /tenants/mine` to trigger ensureProfile

## Deployment Note

This modifies existing migrations — requires `supabase db reset --linked` on hosted Supabase.
