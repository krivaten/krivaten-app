import { describe, it, expect, beforeEach } from "vitest";
import { appGet } from "../helpers/request";
import { authHeaders } from "../helpers/auth";
import { cleanupAllData } from "../helpers/cleanup";
import {
  setupUserWithTenant,
  getTrackerId,
  type TestUser,
} from "../helpers/fixtures";

describe("Trackers Routes", () => {
  let user: TestUser;
  let headers: Record<string, string>;

  beforeEach(async () => {
    await cleanupAllData();
    const setup = await setupUserWithTenant("tracker");
    user = setup.user;
    headers = authHeaders(user.accessToken);
  });

  describe("GET /api/v1/trackers", () => {
    it("returns all 18 system trackers", async () => {
      const res = await appGet("/api/v1/trackers", headers);
      expect(res.status).toBe(200);
      const body: Array<{ code: string; fields: unknown[] }> = await res.json();
      expect(body).toHaveLength(18);
    });

    it("returns trackers with fields included", async () => {
      const res = await appGet("/api/v1/trackers", headers);
      const body: Array<{ code: string; fields: unknown[] }> = await res.json();
      const mood = body.find((t) => t.code === "mood");
      expect(mood).toBeDefined();
      expect(mood!.fields.length).toBeGreaterThan(0);
    });

    it("filters by entity_type=person returns 5 trackers", async () => {
      const res = await appGet("/api/v1/trackers?entity_type=person", headers);
      expect(res.status).toBe(200);
      const body: Array<{ code: string }> = await res.json();
      expect(body).toHaveLength(5);
      const codes = body.map((t) => t.code);
      expect(codes).toContain("behavior");
      expect(codes).toContain("diet");
      expect(codes).toContain("sleep");
      expect(codes).toContain("health");
      expect(codes).toContain("mood");
    });

    it("returns empty array for unknown entity_type", async () => {
      const res = await appGet("/api/v1/trackers?entity_type=nonexistent", headers);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(0);
    });

    it("returns 401 without auth", async () => {
      const res = await appGet("/api/v1/trackers");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/v1/trackers/:id", () => {
    it("returns single tracker with fields", async () => {
      const moodId = await getTrackerId(user, "mood");
      const res = await appGet(`/api/v1/trackers/${moodId}`, headers);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.code).toBe("mood");
      expect(body.fields).toBeDefined();
      expect(body.fields.length).toBeGreaterThan(0);
      // Verify field structure
      const moodField = body.fields.find((f: { code: string }) => f.code === "mood");
      expect(moodField).toBeDefined();
      expect(moodField.field_type).toBe("single_select");
      expect(moodField.options).toBeDefined();
      expect(moodField.options.length).toBeGreaterThan(0);
    });

    it("returns 404 for non-existent id", async () => {
      const res = await appGet(
        "/api/v1/trackers/00000000-0000-0000-0000-000000000000",
        headers,
      );
      expect(res.status).toBe(404);
    });
  });
});
