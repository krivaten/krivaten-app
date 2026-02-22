import { describe, it, expect, beforeEach } from "vitest";
import { appGet, appPost, appPut, appDelete } from "../helpers/request";
import { authHeaders } from "../helpers/auth";
import { cleanupAllData } from "../helpers/cleanup";
import { setupUserWithTenant, type TestUser } from "../helpers/fixtures";

describe("Vocabularies Routes", () => {
  let user: TestUser;
  let headers: Record<string, string>;

  beforeEach(async () => {
    await cleanupAllData();
    const setup = await setupUserWithTenant("vocab");
    user = setup.user;
    headers = authHeaders(user.accessToken);
  });

  describe("GET /api/v1/vocabularies", () => {
    it("lists system vocabularies", async () => {
      const res = await appGet("/api/v1/vocabularies", headers);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
      expect(body.every((v: { is_system: boolean }) => v.is_system === true)).toBe(true);
    });

    it("filters by vocabulary_type", async () => {
      const res = await appGet("/api/v1/vocabularies?type=entity_type", headers);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.length).toBe(8);
      expect(body.every((v: { vocabulary_type: string }) => v.vocabulary_type === "entity_type")).toBe(true);
    });

    it("filters by type and code", async () => {
      const res = await appGet("/api/v1/vocabularies?type=entity_type&code=person", headers);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.length).toBe(1);
      expect(body[0].code).toBe("person");
    });
  });

  describe("POST /api/v1/vocabularies", () => {
    it("creates tenant-specific vocabulary entry", async () => {
      const res = await appPost(
        "/api/v1/vocabularies",
        {
          vocabulary_type: "variable",
          code: "custom_var",
          name: "Custom Variable",
          description: "A custom test variable",
        },
        headers,
      );
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.code).toBe("custom_var");
      expect(body.is_system).toBe(false);
      expect(body.tenant_id).toBeDefined();
    });

    it("rejects is_system=true from API", async () => {
      const res = await appPost(
        "/api/v1/vocabularies",
        {
          vocabulary_type: "variable",
          code: "hacked_system",
          name: "Hacked",
          is_system: true,
        },
        headers,
      );
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.is_system).toBe(false);
    });
  });

  describe("PUT /api/v1/vocabularies/:id", () => {
    it("updates tenant vocabulary", async () => {
      // Create a tenant vocab first
      const createRes = await appPost(
        "/api/v1/vocabularies",
        { vocabulary_type: "variable", code: "to_update", name: "Original" },
        headers,
      );
      const created = await createRes.json();

      const res = await appPut(
        `/api/v1/vocabularies/${created.id}`,
        { name: "Updated Name" },
        headers,
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.name).toBe("Updated Name");
    });

    it("rejects updating system vocabulary", async () => {
      // Get a system vocab
      const listRes = await appGet("/api/v1/vocabularies?type=entity_type&code=person", headers);
      const vocabs = await listRes.json();
      const systemId = vocabs[0].id;

      const res = await appPut(
        `/api/v1/vocabularies/${systemId}`,
        { name: "Hacked Person" },
        headers,
      );
      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /api/v1/vocabularies/:id", () => {
    it("deletes tenant vocabulary", async () => {
      const createRes = await appPost(
        "/api/v1/vocabularies",
        { vocabulary_type: "variable", code: "to_delete", name: "Delete Me" },
        headers,
      );
      const created = await createRes.json();

      const res = await appDelete(`/api/v1/vocabularies/${created.id}`, headers);
      expect(res.status).toBe(204);
    });

    it("rejects deleting system vocabulary", async () => {
      const listRes = await appGet("/api/v1/vocabularies?type=entity_type&code=person", headers);
      const vocabs = await listRes.json();
      const systemId = vocabs[0].id;

      const res = await appDelete(`/api/v1/vocabularies/${systemId}`, headers);
      expect(res.status).toBe(403);
    });
  });
});
