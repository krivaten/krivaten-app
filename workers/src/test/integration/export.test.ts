import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { appGet } from "../helpers/request";
import { authHeaders } from "../helpers/auth";
import { cleanupAllData } from "../helpers/cleanup";
import {
  setupUserWithHousehold,
  createEntityForUser,
  createObservationForUser,
} from "../helpers/fixtures";

describe("Export Routes", () => {
  let user: { id: string; email: string; accessToken: string };
  let headers: Record<string, string>;
  let entityId: string;

  beforeEach(async () => {
    await cleanupAllData();
    const setup = await setupUserWithHousehold("export");
    user = setup.user;
    headers = authHeaders(user.accessToken);
    const entity = await createEntityForUser(user, {
      type: "person",
      name: "Export Person",
    });
    entityId = entity.id;
    await createObservationForUser(user, {
      entity_id: entityId,
      category: "mood",
      notes: "Test observation",
      tags: ["test"],
    });
  });

  afterEach(async () => {
    await cleanupAllData();
  });

  describe("GET /api/export", () => {
    it("returns JSON by default with Content-Disposition header", async () => {
      const res = await appGet("/api/export", headers);
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toContain("application/json");
      expect(res.headers.get("Content-Disposition")).toContain("export.json");
      const body = JSON.parse(await res.text());
      expect(body).toHaveLength(1);
      expect(body[0].category).toBe("mood");
    });

    it("returns markdown with ?format=markdown", async () => {
      const res = await appGet("/api/export?format=markdown", headers);
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toContain("text/markdown");
      expect(res.headers.get("Content-Disposition")).toContain("export.md");
      const text = await res.text();
      expect(text).toContain("# Observations");
      expect(text).toContain("mood");
      expect(text).toContain("Test observation");
    });

    it("filters by entity_id", async () => {
      const entity2 = await createEntityForUser(user, {
        type: "location",
        name: "Garden",
      });
      await createObservationForUser(user, {
        entity_id: entity2.id,
        category: "weather",
      });

      const res = await appGet(`/api/export?entity_id=${entityId}`, headers);
      const body = JSON.parse(await res.text());
      expect(body).toHaveLength(1);
      expect(body[0].entity_id).toBe(entityId);
    });
  });
});
