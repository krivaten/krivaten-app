import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { appGet, appPost, appPut } from "../helpers/request";
import { createTestUser, authHeaders, deleteTestUser } from "../helpers/auth";
import { cleanupAllData } from "../helpers/cleanup";

describe("Households Routes", () => {
  let user: { id: string; email: string; accessToken: string };
  let headers: Record<string, string>;

  beforeEach(async () => {
    await cleanupAllData();
    user = await createTestUser("household");
    headers = authHeaders(user.accessToken);
    // Ensure profile exists
    await appGet("/api/profiles/me", headers);
  });

  afterEach(async () => {
    await cleanupAllData();
  });

  describe("POST /api/households", () => {
    it("creates household and returns 201 with full object (regression: chicken-and-egg bug)", async () => {
      const res = await appPost(
        "/api/households",
        { name: "My Household" },
        headers,
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.id).toBeDefined();
      expect(body.name).toBe("My Household");
      expect(body.created_at).toBeDefined();
    });

    it("rejects duplicate household for same user", async () => {
      await appPost("/api/households", { name: "First" }, headers);
      const res = await appPost(
        "/api/households",
        { name: "Second" },
        headers,
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.detail).toContain("already belong");
    });
  });

  describe("GET /api/households/mine", () => {
    it("returns user's household", async () => {
      await appPost("/api/households", { name: "Test Home" }, headers);
      const res = await appGet("/api/households/mine", headers);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.name).toBe("Test Home");
    });

    it("returns 404 when no household", async () => {
      const res = await appGet("/api/households/mine", headers);
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/households/mine", () => {
    it("updates household name", async () => {
      await appPost("/api/households", { name: "Old Name" }, headers);
      const res = await appPut(
        "/api/households/mine",
        { name: "New Name" },
        headers,
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.name).toBe("New Name");
    });
  });

  describe("Authentication", () => {
    it("returns 401 for unauthenticated requests", async () => {
      const res = await appGet("/api/households/mine");
      expect(res.status).toBe(401);
    });
  });
});
