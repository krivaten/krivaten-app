import { describe, it, expect, beforeEach } from "vitest";
import { appGet, appPost, appPut, appDelete } from "../helpers/request";
import { authHeaders, createTestUser } from "../helpers/auth";
import { cleanupAllData } from "../helpers/cleanup";
import {
  setupUserWithTenant,
  getSystemVocabId,
  createEntityForUser,
  createEdgeForUser,
  createObservationForUser,
  type TestUser,
} from "../helpers/fixtures";

describe("Entities Routes", () => {
  let user: TestUser;
  let headers: Record<string, string>;

  beforeEach(async () => {
    await cleanupAllData();
    const setup = await setupUserWithTenant("entity");
    user = setup.user;
    headers = authHeaders(user.accessToken);
  });

  describe("POST /api/v1/entities", () => {
    it("creates entity with entity_type_id (UUID)", async () => {
      const typeId = await getSystemVocabId(user, "entity_type", "person");
      const res = await appPost(
        "/api/v1/entities",
        { entity_type_id: typeId, name: "Alice" },
        headers,
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.name).toBe("Alice");
      expect(body.entity_type_id).toBe(typeId);
      expect(body.is_active).toBe(true);
    });

    it("creates entity with entity_type code (string resolved to UUID)", async () => {
      const res = await appPost(
        "/api/v1/entities",
        { entity_type: "animal", name: "Rex" },
        headers,
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.name).toBe("Rex");
      expect(body.entity_type_id).toBeDefined();
    });

    it("rejects missing name", async () => {
      const res = await appPost(
        "/api/v1/entities",
        { entity_type: "person" },
        headers,
      );
      expect(res.status).toBe(400);
    });

    it("rejects invalid entity_type code", async () => {
      const res = await appPost(
        "/api/v1/entities",
        { entity_type: "nonexistent_type", name: "Test" },
        headers,
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.detail).toContain("entity type");
    });

    it("rejects entity creation without tenant", async () => {
      const noTenantUser = await createTestUser("notenant");
      const noHeaders = authHeaders(noTenantUser.accessToken);
      await appGet("/api/v1/profiles/me", noHeaders);

      const res = await appPost(
        "/api/v1/entities",
        { entity_type: "person", name: "Bob" },
        noHeaders,
      );
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/v1/entities", () => {
    it("lists entities", async () => {
      await createEntityForUser(user, { entity_type: "person", name: "Alice" });
      await createEntityForUser(user, { entity_type: "animal", name: "Rex" });

      const res = await appGet("/api/v1/entities", headers);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(2);
    });

    it("filters by entity type code", async () => {
      await createEntityForUser(user, { entity_type: "person", name: "Alice" });
      await createEntityForUser(user, { entity_type: "animal", name: "Rex" });

      const res = await appGet("/api/v1/entities?type=person", headers);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(1);
      expect(body[0].name).toBe("Alice");
    });

    it("excludes inactive by default", async () => {
      const entity = await createEntityForUser(user, {
        entity_type: "person",
        name: "Archived Person",
      });
      await appDelete(`/api/v1/entities/${entity.id}`, headers);

      const res = await appGet("/api/v1/entities", headers);
      const body = await res.json();
      expect(body).toHaveLength(0);
    });

    it("includes inactive with ?active=false", async () => {
      const entity = await createEntityForUser(user, {
        entity_type: "person",
        name: "Archived Person",
      });
      await appDelete(`/api/v1/entities/${entity.id}`, headers);

      const res = await appGet("/api/v1/entities?active=false", headers);
      const body = await res.json();
      expect(body).toHaveLength(1);
      expect(body[0].is_active).toBe(false);
    });
  });

  describe("GET /api/v1/entities/:id", () => {
    it("returns entity with joined entity_type vocabulary", async () => {
      const entity = await createEntityForUser(user, {
        entity_type: "person",
        name: "Alice",
      });
      const res = await appGet(`/api/v1/entities/${entity.id}`, headers);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.name).toBe("Alice");
      expect(body.entity_type).toBeDefined();
      expect(body.entity_type.code).toBe("person");
    });
  });

  describe("PUT /api/v1/entities/:id", () => {
    it("updates name, description, attributes", async () => {
      const entity = await createEntityForUser(user, {
        entity_type: "person",
        name: "Alice",
      });
      const res = await appPut(
        `/api/v1/entities/${entity.id}`,
        {
          name: "Alice Updated",
          description: "A test person",
          attributes: { allergies: "pollen" },
        },
        headers,
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.name).toBe("Alice Updated");
      expect(body.description).toBe("A test person");
      expect(body.attributes).toEqual({ allergies: "pollen" });
    });
  });

  describe("DELETE /api/v1/entities/:id", () => {
    it("soft-deletes (sets is_active=false), returns 204", async () => {
      const entity = await createEntityForUser(user, {
        entity_type: "person",
        name: "Alice",
      });
      const res = await appDelete(`/api/v1/entities/${entity.id}`, headers);
      expect(res.status).toBe(204);

      // Verify soft-deleted
      const getRes = await appGet(`/api/v1/entities/${entity.id}`, headers);
      const body = await getRes.json();
      expect(body.is_active).toBe(false);
    });
  });

  describe("GET /api/v1/entities/:id/edges", () => {
    it("returns edges for an entity", async () => {
      const entityA = await createEntityForUser(user, { entity_type: "person", name: "Alice" });
      const entityB = await createEntityForUser(user, { entity_type: "location", name: "Garden" });
      await createEdgeForUser(user, {
        source_id: entityA.id,
        target_id: entityB.id,
        edge_type: "located_in",
      });

      const res = await appGet(`/api/v1/entities/${entityA.id}/edges`, headers);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(1);
      expect(body[0].edge_type).toBe("located_in");
    });
  });

  describe("GET /api/v1/entities/:id/timeseries", () => {
    it("returns time-series observations via RPC", async () => {
      const entity = await createEntityForUser(user, { entity_type: "plant", name: "Tomato" });
      const varId = await getSystemVocabId(user, "variable", "temperature");
      await createObservationForUser(user, {
        subject_id: entity.id,
        variable_id: varId,
        value_numeric: 22.5,
      });

      const res = await appGet(`/api/v1/entities/${entity.id}/timeseries`, headers);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.length).toBeGreaterThanOrEqual(1);
      expect(body[0].value_numeric).toBe(22.5);
    });
  });

  describe("GET /api/v1/entities/:id/related", () => {
    it("returns related entities via graph traversal", async () => {
      const entityA = await createEntityForUser(user, { entity_type: "person", name: "Alice" });
      const entityB = await createEntityForUser(user, { entity_type: "location", name: "Garden" });
      await createEdgeForUser(user, {
        source_id: entityA.id,
        target_id: entityB.id,
        edge_type: "located_in",
      });

      const res = await appGet(`/api/v1/entities/${entityA.id}/related`, headers);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.length).toBeGreaterThanOrEqual(1);
      expect(body[0].entity_name).toBe("Garden");
    });
  });
});
