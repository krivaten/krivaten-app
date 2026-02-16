import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { appGet, appPost, appDelete } from "../helpers/request";
import { authHeaders } from "../helpers/auth";
import { cleanupAllData } from "../helpers/cleanup";
import {
  setupUserWithHousehold,
  createEntityForUser,
  createObservationForUser,
} from "../helpers/fixtures";

describe("Observations Routes", () => {
  let user: { id: string; email: string; accessToken: string };
  let headers: Record<string, string>;
  let entityId: string;

  beforeEach(async () => {
    await cleanupAllData();
    const setup = await setupUserWithHousehold("obs");
    user = setup.user;
    headers = authHeaders(user.accessToken);
    const entity = await createEntityForUser(user, {
      type: "person",
      name: "Test Person",
    });
    entityId = entity.id;
  });

  afterEach(async () => {
    await cleanupAllData();
  });

  describe("POST /api/observations", () => {
    it("creates observation with entity join in response", async () => {
      const res = await appPost(
        "/api/observations",
        {
          entity_id: entityId,
          category: "mood",
          notes: "Feeling good",
          tags: ["positive"],
        },
        headers,
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.entity_id).toBe(entityId);
      expect(body.category).toBe("mood");
      expect(body.notes).toBe("Feeling good");
      expect(body.tags).toEqual(["positive"]);
      expect(body.entity).toBeDefined();
      expect(body.entity.name).toBe("Test Person");
    });
  });

  describe("GET /api/observations", () => {
    it("returns paginated results", async () => {
      await createObservationForUser(user, {
        entity_id: entityId,
        category: "mood",
      });
      await createObservationForUser(user, {
        entity_id: entityId,
        category: "health",
      });

      const res = await appGet("/api/observations", headers);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(2);
      expect(body.count).toBe(2);
      expect(body.page).toBe(1);
      expect(body.per_page).toBeDefined();
    });

    it("filters by entity_id", async () => {
      const entity2 = await createEntityForUser(user, {
        type: "location",
        name: "Garden",
      });
      await createObservationForUser(user, {
        entity_id: entityId,
        category: "mood",
      });
      await createObservationForUser(user, {
        entity_id: entity2.id,
        category: "weather",
      });

      const res = await appGet(
        `/api/observations?entity_id=${entityId}`,
        headers,
      );
      const body = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].entity_id).toBe(entityId);
    });

    it("filters by category", async () => {
      await createObservationForUser(user, {
        entity_id: entityId,
        category: "mood",
      });
      await createObservationForUser(user, {
        entity_id: entityId,
        category: "health",
      });

      const res = await appGet("/api/observations?category=mood", headers);
      const body = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].category).toBe("mood");
    });

    it("filters by tags", async () => {
      await createObservationForUser(user, {
        entity_id: entityId,
        category: "mood",
        tags: ["positive", "morning"],
      });
      await createObservationForUser(user, {
        entity_id: entityId,
        category: "mood",
        tags: ["negative"],
      });

      const res = await appGet("/api/observations?tags=positive", headers);
      const body = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].tags).toContain("positive");
    });

    it("filters by date range (from/to)", async () => {
      await createObservationForUser(user, {
        entity_id: entityId,
        category: "mood",
        observed_at: "2026-01-01T10:00:00Z",
      });
      await createObservationForUser(user, {
        entity_id: entityId,
        category: "mood",
        observed_at: "2026-02-15T10:00:00Z",
      });

      const res = await appGet(
        "/api/observations?from=2026-02-01T00:00:00Z&to=2026-02-28T23:59:59Z",
        headers,
      );
      const body = await res.json();
      expect(body.data).toHaveLength(1);
    });
  });

  describe("POST /api/observations/bulk", () => {
    it("creates multiple observations", async () => {
      const res = await appPost(
        "/api/observations/bulk",
        {
          observations: [
            { entity_id: entityId, category: "mood" },
            { entity_id: entityId, category: "health" },
            { entity_id: entityId, category: "sleep" },
          ],
        },
        headers,
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toHaveLength(3);
    });
  });

  describe("GET /api/observations/:id", () => {
    it("returns single observation", async () => {
      const obs = await createObservationForUser(user, {
        entity_id: entityId,
        category: "mood",
        notes: "Test note",
      });
      const res = await appGet(`/api/observations/${obs.id}`, headers);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe(obs.id);
      expect(body.notes).toBe("Test note");
    });
  });

  describe("DELETE /api/observations/:id", () => {
    it("deletes own observation", async () => {
      const obs = await createObservationForUser(user, {
        entity_id: entityId,
        category: "mood",
      });
      const res = await appDelete(`/api/observations/${obs.id}`, headers);
      expect(res.status).toBe(204);

      const getRes = await appGet(`/api/observations/${obs.id}`, headers);
      expect(getRes.status).toBe(404);
    });
  });
});
