import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { appGet, appPost, appPut, appDelete } from "../helpers/request";
import { authHeaders, createTestUser } from "../helpers/auth";
import { cleanupAllData } from "../helpers/cleanup";
import { createHouseholdForUser, createEntityForUser } from "../helpers/fixtures";

describe("Entities Routes", () => {
  let user: { id: string; email: string; accessToken: string };
  let headers: Record<string, string>;

  beforeEach(async () => {
    await cleanupAllData();
    user = await createTestUser("entity");
    headers = authHeaders(user.accessToken);
    await createHouseholdForUser(user, "Entity Test Home");
  });

  afterEach(async () => {
    await cleanupAllData();
  });

  describe("POST /api/entities", () => {
    it("creates entity with type, name, properties", async () => {
      const res = await appPost(
        "/api/entities",
        {
          type: "person",
          name: "Alice",
          properties: { age: 30 },
        },
        headers,
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.type).toBe("person");
      expect(body.name).toBe("Alice");
      expect(body.properties).toEqual({ age: 30 });
      expect(body.archived).toBe(false);
    });

    it("creates entity with parent_id (hierarchical)", async () => {
      const parent = await createEntityForUser(user, {
        type: "location",
        name: "House",
      });
      const res = await appPost(
        "/api/entities",
        {
          type: "location",
          name: "Kitchen",
          parent_id: parent.id,
        },
        headers,
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.parent_id).toBe(parent.id);
    });

    it("rejects entity creation without household membership", async () => {
      const noHouseholdUser = await createTestUser("nohousehold");
      const noHeaders = authHeaders(noHouseholdUser.accessToken);
      // Ensure profile exists
      await appGet("/api/profiles/me", noHeaders);

      const res = await appPost(
        "/api/entities",
        { type: "person", name: "Bob" },
        noHeaders,
      );
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/entities", () => {
    it("lists all entities", async () => {
      await createEntityForUser(user, { type: "person", name: "Alice" });
      await createEntityForUser(user, { type: "animal", name: "Rex" });

      const res = await appGet("/api/entities", headers);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(2);
    });

    it("filters by type", async () => {
      await createEntityForUser(user, { type: "person", name: "Alice" });
      await createEntityForUser(user, { type: "animal", name: "Rex" });

      const res = await appGet("/api/entities?type=person", headers);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(1);
      expect(body[0].name).toBe("Alice");
    });

    it("excludes archived by default, includes with ?archived=true", async () => {
      const entity = await createEntityForUser(user, {
        type: "person",
        name: "Archived Person",
      });
      await appDelete(`/api/entities/${entity.id}`, headers);

      // Default: excludes archived
      const res1 = await appGet("/api/entities", headers);
      const body1 = await res1.json();
      expect(body1).toHaveLength(0);

      // With archived=true: includes archived
      const res2 = await appGet("/api/entities?archived=true", headers);
      const body2 = await res2.json();
      expect(body2).toHaveLength(1);
      expect(body2[0].archived).toBe(true);
    });
  });

  describe("GET /api/entities/:id", () => {
    it("returns single entity", async () => {
      const entity = await createEntityForUser(user, {
        type: "person",
        name: "Alice",
      });
      const res = await appGet(`/api/entities/${entity.id}`, headers);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.name).toBe("Alice");
    });
  });

  describe("PUT /api/entities/:id", () => {
    it("updates properties", async () => {
      const entity = await createEntityForUser(user, {
        type: "person",
        name: "Alice",
        properties: { age: 30 },
      });
      const res = await appPut(
        `/api/entities/${entity.id}`,
        { properties: { age: 31, height: 170 } },
        headers,
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.properties).toEqual({ age: 31, height: 170 });
    });
  });

  describe("DELETE /api/entities/:id", () => {
    it("soft-archives entity (204)", async () => {
      const entity = await createEntityForUser(user, {
        type: "person",
        name: "Alice",
      });
      const res = await appDelete(`/api/entities/${entity.id}`, headers);
      expect(res.status).toBe(204);

      // Verify archived
      const getRes = await appGet(`/api/entities/${entity.id}`, headers);
      const body = await getRes.json();
      expect(body.archived).toBe(true);
    });
  });
});
