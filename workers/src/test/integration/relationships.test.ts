import { describe, it, expect, beforeEach } from "vitest";
import { appGet, appPost, appDelete } from "../helpers/request";
import { authHeaders } from "../helpers/auth";
import { cleanupAllData } from "../helpers/cleanup";
import {
  setupUserWithTenant,
  createEntityForUser,
  createRelationshipForUser,
  type TestUser,
} from "../helpers/fixtures";

describe("Relationships Routes", () => {
  let user: TestUser;
  let headers: Record<string, string>;
  let entityA: { id: string; [key: string]: unknown };
  let entityB: { id: string; [key: string]: unknown };

  beforeEach(async () => {
    await cleanupAllData();
    const setup = await setupUserWithTenant("rel");
    user = setup.user;
    headers = authHeaders(user.accessToken);

    entityA = await createEntityForUser(user, { entity_type: "person", name: "Alice" });
    entityB = await createEntityForUser(user, { entity_type: "location", name: "Garden" });
  });

  describe("POST /api/v1/relationships", () => {
    it("creates relationship between two entities", async () => {
      const res = await appPost(
        "/api/v1/relationships",
        {
          source_id: entityA.id,
          target_id: entityB.id,
          type: "located_in",
        },
        headers,
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.source_id).toBe(entityA.id);
      expect(body.target_id).toBe(entityB.id);
      expect(body.type).toBe("located_in");
    });

    it("rejects missing required fields", async () => {
      const res = await appPost(
        "/api/v1/relationships",
        { source_id: entityA.id },
        headers,
      );
      expect(res.status).toBe(400);
    });

    it("returns 401 without auth", async () => {
      const res = await appPost("/api/v1/relationships", {
        source_id: entityA.id,
        target_id: entityB.id,
        type: "located_in",
      });
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/v1/relationships", () => {
    it("lists relationships filtered by entity_id", async () => {
      await createRelationshipForUser(user, {
        source_id: entityA.id,
        target_id: entityB.id,
        type: "located_in",
      });

      const res = await appGet(`/api/v1/relationships?entity_id=${entityA.id}`, headers);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(1);
      expect(body[0].type).toBe("located_in");
    });

    it("filters by type", async () => {
      await createRelationshipForUser(user, {
        source_id: entityA.id,
        target_id: entityB.id,
        type: "located_in",
      });
      await createRelationshipForUser(user, {
        source_id: entityA.id,
        target_id: entityB.id,
        type: "manages",
      });

      const res = await appGet("/api/v1/relationships?type=located_in", headers);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(1);
    });

    it("returns relationships with joined source/target entity data", async () => {
      await createRelationshipForUser(user, {
        source_id: entityA.id,
        target_id: entityB.id,
        type: "located_in",
      });

      const res = await appGet(`/api/v1/relationships?entity_id=${entityA.id}`, headers);
      const body = await res.json();
      expect(body[0].source).toBeDefined();
      expect(body[0].source.name).toBe("Alice");
      expect(body[0].target).toBeDefined();
      expect(body[0].target.name).toBe("Garden");
    });
  });

  describe("DELETE /api/v1/relationships/:id", () => {
    it("deletes relationship, returns 204", async () => {
      const rel = await createRelationshipForUser(user, {
        source_id: entityA.id,
        target_id: entityB.id,
        type: "located_in",
      });

      const res = await appDelete(`/api/v1/relationships/${rel.id}`, headers);
      expect(res.status).toBe(204);

      // Verify deleted
      const listRes = await appGet(`/api/v1/relationships?entity_id=${entityA.id}`, headers);
      const body = await listRes.json();
      expect(body).toHaveLength(0);
    });
  });
});
