import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { appGet, appPost, appDelete } from "../helpers/request";
import { authHeaders } from "../helpers/auth";
import { cleanupAllData } from "../helpers/cleanup";
import { setupUserWithHousehold, createEntityForUser } from "../helpers/fixtures";

describe("Relationships Routes", () => {
  let user: { id: string; email: string; accessToken: string };
  let headers: Record<string, string>;
  let entityA: { id: string };
  let entityB: { id: string };

  beforeEach(async () => {
    await cleanupAllData();
    const setup = await setupUserWithHousehold("rel");
    user = setup.user;
    headers = authHeaders(user.accessToken);
    entityA = await createEntityForUser(user, {
      type: "person",
      name: "Alice",
    });
    entityB = await createEntityForUser(user, {
      type: "person",
      name: "Bob",
    });
  });

  afterEach(async () => {
    await cleanupAllData();
  });

  describe("POST /api/relationships", () => {
    it("creates relationship between entities", async () => {
      const res = await appPost(
        "/api/relationships",
        {
          from_entity_id: entityA.id,
          to_entity_id: entityB.id,
          relationship_type: "parent_of",
        },
        headers,
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.from_entity_id).toBe(entityA.id);
      expect(body.to_entity_id).toBe(entityB.id);
      expect(body.relationship_type).toBe("parent_of");
    });
  });

  describe("GET /api/relationships", () => {
    it("lists all relationships with joined entity data", async () => {
      await appPost(
        "/api/relationships",
        {
          from_entity_id: entityA.id,
          to_entity_id: entityB.id,
          relationship_type: "parent_of",
        },
        headers,
      );

      const res = await appGet("/api/relationships", headers);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(1);
      expect(body[0].from_entity).toBeDefined();
      expect(body[0].from_entity.name).toBe("Alice");
      expect(body[0].to_entity).toBeDefined();
      expect(body[0].to_entity.name).toBe("Bob");
    });

    it("filters by entity_id (matches from OR to)", async () => {
      const entityC = await createEntityForUser(user, {
        type: "person",
        name: "Charlie",
      });
      await appPost(
        "/api/relationships",
        {
          from_entity_id: entityA.id,
          to_entity_id: entityB.id,
          relationship_type: "parent_of",
        },
        headers,
      );
      await appPost(
        "/api/relationships",
        {
          from_entity_id: entityB.id,
          to_entity_id: entityC.id,
          relationship_type: "sibling_of",
        },
        headers,
      );

      // Filter by entityB — should match both (as from and as to)
      const res = await appGet(
        `/api/relationships?entity_id=${entityB.id}`,
        headers,
      );
      const body = await res.json();
      expect(body).toHaveLength(2);
    });
  });

  describe("DELETE /api/relationships/:id", () => {
    it("removes relationship (204)", async () => {
      const createRes = await appPost(
        "/api/relationships",
        {
          from_entity_id: entityA.id,
          to_entity_id: entityB.id,
          relationship_type: "parent_of",
        },
        headers,
      );
      const rel = await createRes.json();

      const res = await appDelete(`/api/relationships/${rel.id}`, headers);
      expect(res.status).toBe(204);

      // Verify deleted
      const listRes = await appGet("/api/relationships", headers);
      const body = await listRes.json();
      expect(body).toHaveLength(0);
    });
  });
});
