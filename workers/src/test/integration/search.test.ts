import { describe, it, expect, beforeEach } from "vitest";
import { appGet } from "../helpers/request";
import { authHeaders } from "../helpers/auth";
import { cleanupAllData } from "../helpers/cleanup";
import {
  setupUserWithTenant,
  createEntityForUser,
  type TestUser,
} from "../helpers/fixtures";

describe("Search Routes", () => {
  let user: TestUser;
  let headers: Record<string, string>;

  beforeEach(async () => {
    await cleanupAllData();
    const setup = await setupUserWithTenant("search");
    user = setup.user;
    headers = authHeaders(user.accessToken);
  });

  describe("GET /api/v1/search/entities", () => {
    it("finds entities by name ILIKE", async () => {
      await createEntityForUser(user, { entity_type: "person", name: "Alice Smith" });
      await createEntityForUser(user, { entity_type: "person", name: "Bob Jones" });

      const res = await appGet("/api/v1/search/entities?q=alice", headers);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(1);
      expect(body[0].name).toBe("Alice Smith");
    });

    it("returns empty array when no match", async () => {
      await createEntityForUser(user, { entity_type: "person", name: "Alice" });

      const res = await appGet("/api/v1/search/entities?q=nonexistent", headers);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(0);
    });
  });

  describe("GET /api/v1/search/taxonomy", () => {
    it("finds entities by taxonomy path prefix", async () => {
      await createEntityForUser(user, {
        entity_type: "plant",
        name: "Rose",
        taxonomy_path: "biology.botany.flowering",
      });
      await createEntityForUser(user, {
        entity_type: "plant",
        name: "Oak",
        taxonomy_path: "biology.botany.trees",
      });
      await createEntityForUser(user, {
        entity_type: "animal",
        name: "Dog",
        taxonomy_path: "biology.zoology.mammals",
      });

      const res = await appGet("/api/v1/search/taxonomy?path=biology.botany", headers);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(2);
    });
  });
});
