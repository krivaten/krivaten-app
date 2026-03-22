import { describe, it, expect, beforeEach } from "vitest";
import { appGet, appPost } from "../helpers/request";
import { authHeaders } from "../helpers/auth";
import { cleanupAllData } from "../helpers/cleanup";
import {
  setupUserWithTenant,
  createEntityForUser,
  createRelationshipForUser,
  createObservationForUser,
  type TestUser,
} from "../helpers/fixtures";

describe("RLS Isolation and Regression", () => {
  let userA: TestUser;
  let userB: TestUser;
  let headersA: Record<string, string>;
  let headersB: Record<string, string>;
  let entityA: { id: string; [key: string]: unknown };

  beforeEach(async () => {
    await cleanupAllData();

    // Set up two users in separate tenants
    const setupA = await setupUserWithTenant("rlsA", "Space A");
    userA = setupA.user;
    headersA = authHeaders(userA.accessToken);

    const setupB = await setupUserWithTenant("rlsB", "Space B");
    userB = setupB.user;
    headersB = authHeaders(userB.accessToken);

    // Create data for User A
    entityA = await createEntityForUser(userA, {
      entity_type: "person",
      name: "Alice Private",
    });

    await createObservationForUser(userA, {
      entity_id: entityA.id,
      metric: "mood",
      field_values: { mood: "good" },
    });
  });

  describe("Cross-tenant isolation", () => {
    it("User B cannot see User A's entities", async () => {
      const res = await appGet("/api/v1/entities", headersB);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(0);
    });

    it("User B cannot see User A's relationships", async () => {
      const entityA2 = await createEntityForUser(userA, {
        entity_type: "person",
        name: "Alice Friend",
      });
      await createRelationshipForUser(userA, {
        source_id: entityA.id,
        target_id: entityA2.id,
        type: "manages",
      });

      const res = await appGet("/api/v1/relationships?entity_id=" + entityA.id, headersB);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(0);
    });

    it("User B cannot see User A's observations", async () => {
      const res = await appGet("/api/v1/observations", headersB);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(0);
    });

    it("Both users CAN see system entity types", async () => {
      const res = await appGet("/api/v1/entity-types", headersB);
      expect(res.status).toBe(200);
      const body: Array<{ is_system: boolean }> = await res.json();
      expect(body.length).toBe(8);
      expect(body.every((t) => t.is_system === true)).toBe(true);
    });

    it("Both users CAN see system metrics", async () => {
      const res = await appGet("/api/v1/metrics", headersB);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.length).toBe(18);
    });

    it("User B's tenant is isolated from User A's", async () => {
      const res = await appGet("/api/v1/tenants/mine", headersB);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.name).toBe("Space B");
    });
  });

  describe("RLS regression tests", () => {
    it("GET /api/v1/profiles/me does not cause infinite recursion", async () => {
      const res = await appGet("/api/v1/profiles/me", headersA);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe(userA.id);
    });

    it("entity creation works immediately after tenant creation", async () => {
      await cleanupAllData();
      const setup = await setupUserWithTenant("regression");
      const user = setup.user;
      const headers = authHeaders(user.accessToken);

      const res = await appPost(
        "/api/v1/entities",
        { entity_type: "person", name: "Immediate Entity" },
        headers,
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.name).toBe("Immediate Entity");
    });
  });
});
