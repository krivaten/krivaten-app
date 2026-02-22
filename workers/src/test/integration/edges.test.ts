import { describe, it, expect, beforeEach } from "vitest";
import { appGet, appPost, appDelete } from "../helpers/request";
import { authHeaders } from "../helpers/auth";
import { cleanupAllData } from "../helpers/cleanup";
import {
  setupUserWithTenant,
  createEntityForUser,
  createEdgeForUser,
  type TestUser,
} from "../helpers/fixtures";

describe("Edges Routes", () => {
  let user: TestUser;
  let headers: Record<string, string>;
  let entityA: Entity;
  let entityB: Entity;

  beforeEach(async () => {
    await cleanupAllData();
    const setup = await setupUserWithTenant("edge");
    user = setup.user;
    headers = authHeaders(user.accessToken);

    entityA = await createEntityForUser(user, { entity_type: "person", name: "Alice" });
    entityB = await createEntityForUser(user, { entity_type: "location", name: "Garden" });
  });

  describe("POST /api/v1/edges", () => {
    it("creates edge between two entities", async () => {
      const res = await appPost(
        "/api/v1/edges",
        {
          source_id: entityA.id,
          target_id: entityB.id,
          edge_type: "located_in",
        },
        headers,
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.source_id).toBe(entityA.id);
      expect(body.target_id).toBe(entityB.id);
      expect(body.edge_type).toBe("located_in");
    });

    it("rejects missing required fields", async () => {
      const res = await appPost(
        "/api/v1/edges",
        { source_id: entityA.id },
        headers,
      );
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/v1/edges", () => {
    it("lists edges filtered by entity_id", async () => {
      await createEdgeForUser(user, {
        source_id: entityA.id,
        target_id: entityB.id,
        edge_type: "located_in",
      });

      const res = await appGet(`/api/v1/edges?entity_id=${entityA.id}`, headers);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(1);
      expect(body[0].edge_type).toBe("located_in");
    });

    it("filters by edge_type", async () => {
      await createEdgeForUser(user, {
        source_id: entityA.id,
        target_id: entityB.id,
        edge_type: "located_in",
      });
      await createEdgeForUser(user, {
        source_id: entityA.id,
        target_id: entityB.id,
        edge_type: "manages",
      });

      const res = await appGet("/api/v1/edges?edge_type=located_in", headers);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(1);
    });

    it("returns edges with joined source/target entity data", async () => {
      await createEdgeForUser(user, {
        source_id: entityA.id,
        target_id: entityB.id,
        edge_type: "located_in",
      });

      const res = await appGet(`/api/v1/edges?entity_id=${entityA.id}`, headers);
      const body = await res.json();
      expect(body[0].source).toBeDefined();
      expect(body[0].source.name).toBe("Alice");
      expect(body[0].target).toBeDefined();
      expect(body[0].target.name).toBe("Garden");
    });
  });

  describe("DELETE /api/v1/edges/:id", () => {
    it("hard-deletes edge, returns 204", async () => {
      const edge = await createEdgeForUser(user, {
        source_id: entityA.id,
        target_id: entityB.id,
        edge_type: "located_in",
      });

      const res = await appDelete(`/api/v1/edges/${edge.id}`, headers);
      expect(res.status).toBe(204);

      // Verify deleted
      const listRes = await appGet(`/api/v1/edges?entity_id=${entityA.id}`, headers);
      const body = await listRes.json();
      expect(body).toHaveLength(0);
    });
  });
});
