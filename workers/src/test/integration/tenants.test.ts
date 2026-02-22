import { describe, it, expect, beforeEach } from "vitest";
import { appGet, appPost, appPut } from "../helpers/request";
import { createTestUser, authHeaders } from "../helpers/auth";
import { cleanupAllData } from "../helpers/cleanup";
import type { TestUser } from "../helpers/fixtures";

describe("Tenants Routes", () => {
  let user: TestUser;

  beforeEach(async () => {
    await cleanupAllData();
    user = await createTestUser("tenant");
  });

  describe("POST /api/v1/tenants", () => {
    it("creates a tenant and returns 201", async () => {
      const headers = authHeaders(user.accessToken);
      await appGet("/api/v1/profiles/me", headers); // ensure profile exists

      const res = await appPost("/api/v1/tenants", { name: "My Workspace" }, headers);
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.name).toBe("My Workspace");
      expect(body.id).toBeDefined();
    });

    it("rejects creating a second tenant", async () => {
      const headers = authHeaders(user.accessToken);
      await appGet("/api/v1/profiles/me", headers);

      await appPost("/api/v1/tenants", { name: "First" }, headers);
      const res = await appPost("/api/v1/tenants", { name: "Second" }, headers);
      expect(res.status).toBe(400);
    });

    it("returns 401 for unauthenticated requests", async () => {
      const res = await appPost("/api/v1/tenants", { name: "Test" });
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/v1/tenants/mine", () => {
    it("returns the user's tenant", async () => {
      const headers = authHeaders(user.accessToken);
      await appGet("/api/v1/profiles/me", headers);
      await appPost("/api/v1/tenants", { name: "My Workspace" }, headers);

      const res = await appGet("/api/v1/tenants/mine", headers);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.name).toBe("My Workspace");
    });

    it("returns 404 when user has no tenant", async () => {
      const headers = authHeaders(user.accessToken);
      await appGet("/api/v1/profiles/me", headers);

      const res = await appGet("/api/v1/tenants/mine", headers);
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/v1/tenants/mine", () => {
    it("updates tenant name", async () => {
      const headers = authHeaders(user.accessToken);
      await appGet("/api/v1/profiles/me", headers);
      await appPost("/api/v1/tenants", { name: "Original" }, headers);

      const res = await appPut("/api/v1/tenants/mine", { name: "Updated" }, headers);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.name).toBe("Updated");
    });
  });
});
