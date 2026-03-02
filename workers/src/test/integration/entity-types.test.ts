import { describe, it, expect, beforeEach } from "vitest";
import { appGet } from "../helpers/request";
import { authHeaders, createTestUser } from "../helpers/auth";
import { cleanupAllData } from "../helpers/cleanup";
import {
  setupUserWithTenant,
  getEntityTypeId,
  type TestUser,
} from "../helpers/fixtures";

describe("Entity Types Routes", () => {
  let user: TestUser;
  let headers: Record<string, string>;

  beforeEach(async () => {
    await cleanupAllData();
    const setup = await setupUserWithTenant("etype");
    user = setup.user;
    headers = authHeaders(user.accessToken);
  });

  describe("GET /api/v1/entity-types", () => {
    it("returns all 8 system entity types", async () => {
      const res = await appGet("/api/v1/entity-types", headers);
      expect(res.status).toBe(200);
      const body: Array<{ code: string; is_system: boolean }> = await res.json();
      expect(body).toHaveLength(8);
      expect(body.every((t) => t.is_system === true)).toBe(true);
    });

    it("filters by code", async () => {
      const res = await appGet("/api/v1/entity-types?code=person", headers);
      expect(res.status).toBe(200);
      const body: Array<{ code: string }> = await res.json();
      expect(body).toHaveLength(1);
      expect(body[0].code).toBe("person");
    });

    it("returns 401 without auth", async () => {
      const res = await appGet("/api/v1/entity-types");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/v1/entity-types/:id", () => {
    it("returns single entity type with default trackers", async () => {
      const personId = await getEntityTypeId(user, "person");
      const res = await appGet(`/api/v1/entity-types/${personId}`, headers);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.code).toBe("person");
      expect(body.trackers).toBeDefined();
      expect(body.trackers.length).toBeGreaterThan(0);
    });

    it("returns 404 for non-existent id", async () => {
      const res = await appGet(
        "/api/v1/entity-types/00000000-0000-0000-0000-000000000000",
        headers,
      );
      expect(res.status).toBe(404);
    });
  });
});
