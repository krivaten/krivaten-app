import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { appGet, appPost } from "../helpers/request";
import { authHeaders } from "../helpers/auth";
import { cleanupAllData } from "../helpers/cleanup";
import {
  setupUserWithHousehold,
  createEntityForUser,
  createObservationForUser,
} from "../helpers/fixtures";

describe("RLS Isolation and Regression", () => {
  let userA: { id: string; email: string; accessToken: string };
  let userB: { id: string; email: string; accessToken: string };
  let headersA: Record<string, string>;
  let headersB: Record<string, string>;
  let entityA: { id: string };

  beforeEach(async () => {
    await cleanupAllData();

    // Set up two users in separate households
    const setupA = await setupUserWithHousehold("rlsA", "Household A");
    userA = setupA.user;
    headersA = authHeaders(userA.accessToken);

    const setupB = await setupUserWithHousehold("rlsB", "Household B");
    userB = setupB.user;
    headersB = authHeaders(userB.accessToken);

    // Create data for User A
    entityA = await createEntityForUser(userA, {
      type: "person",
      name: "Alice Private",
    });
    await createObservationForUser(userA, {
      entity_id: entityA.id,
      category: "mood",
      notes: "Private observation",
    });
  });

  afterEach(async () => {
    await cleanupAllData();
  });

  describe("Cross-household isolation", () => {
    it("User B cannot see User A's entities", async () => {
      const res = await appGet("/api/entities", headersB);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(0);
    });

    it("User B cannot see User A's observations", async () => {
      const res = await appGet("/api/observations", headersB);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(0);
    });

    it("User B cannot see User A's relationships", async () => {
      const entityA2 = await createEntityForUser(userA, {
        type: "person",
        name: "Alice Friend",
      });
      await appPost(
        "/api/relationships",
        {
          from_entity_id: entityA.id,
          to_entity_id: entityA2.id,
          relationship_type: "friend_of",
        },
        headersA,
      );

      const res = await appGet("/api/relationships", headersB);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(0);
    });

    it("User B cannot see User A's household", async () => {
      // User B's /mine should return their own household, not A's
      const res = await appGet("/api/households/mine", headersB);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.name).toBe("Household B");
    });

    it("Export only returns own household's data", async () => {
      const res = await appGet("/api/export", headersB);
      expect(res.status).toBe(200);
      const body = JSON.parse(await res.text());
      expect(body).toHaveLength(0);
    });
  });

  describe("RLS regression tests", () => {
    it("GET /api/profiles/me does not cause infinite recursion", async () => {
      // Regression: profiles SELECT policy had a subquery back into profiles,
      // causing infinite recursion via get_my_household_id()
      const res = await appGet("/api/profiles/me", headersA);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe(userA.id);
    });

    it("entity creation works immediately after household creation", async () => {
      // Regression: INSERT+SELECT chicken-and-egg — .select() after INSERT
      // failed because SELECT RLS checked get_my_household_id() which was NULL
      await cleanupAllData();
      const setup = await setupUserWithHousehold("regression");
      const user = setup.user;
      const headers = authHeaders(user.accessToken);

      // This should work immediately — no delay needed
      const res = await appPost(
        "/api/entities",
        { type: "person", name: "Immediate Entity" },
        headers,
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.name).toBe("Immediate Entity");
    });
  });
});
