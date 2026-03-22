import { describe, it, expect, beforeEach } from "vitest";
import { appGet, appPost, appDelete } from "../helpers/request";
import { authHeaders } from "../helpers/auth";
import { cleanupAllData } from "../helpers/cleanup";
import {
  setupUserWithTenant,
  createEntityForUser,
  createObservationForUser,
  type TestUser,
} from "../helpers/fixtures";

describe("Observations Routes", () => {
  let user: TestUser;
  let headers: Record<string, string>;
  let entity: { id: string; [key: string]: unknown };

  beforeEach(async () => {
    await cleanupAllData();
    const setup = await setupUserWithTenant("obs");
    user = setup.user;
    headers = authHeaders(user.accessToken);
    entity = await createEntityForUser(user, { entity_type: "plant", name: "Tomato" });
  });

  describe("POST /api/v1/observations", () => {
    it("creates observation with metric code and field_values", async () => {
      const res = await appPost(
        "/api/v1/observations",
        {
          entity_id: entity.id,
          metric: "mood",
          field_values: { mood: "good", energy: "high" },
        },
        headers,
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.entity_id).toBe(entity.id);
      expect(body.field_values).toEqual({ mood: "good", energy: "high" });
      expect(body.observer_id).toBe(user.id);
    });

    it("creates observation with metric_id (UUID)", async () => {
      // Get metric id for growth
      const metricsRes = await appGet("/api/v1/metrics", headers);
      const metrics: Array<{ id: string; code: string }> = await metricsRes.json();
      const growth = metrics.find((t) => t.code === "growth");

      const res = await appPost(
        "/api/v1/observations",
        {
          entity_id: entity.id,
          metric_id: growth!.id,
          field_values: { height_cm: 45 },
        },
        headers,
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.metric_id).toBe(growth!.id);
    });

    it("returns observation with joined entity and metric", async () => {
      const res = await appPost(
        "/api/v1/observations",
        {
          entity_id: entity.id,
          metric: "health",
          field_values: { status: "good" },
        },
        headers,
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.entity).toBeDefined();
      expect(body.entity.name).toBe("Tomato");
      expect(body.metric).toBeDefined();
      expect(body.metric.code).toBe("health");
    });

    it("rejects missing entity_id", async () => {
      const res = await appPost(
        "/api/v1/observations",
        { metric: "mood", field_values: { mood: "good" } },
        headers,
      );
      expect(res.status).toBe(400);
    });

    it("rejects missing metric", async () => {
      const res = await appPost(
        "/api/v1/observations",
        { entity_id: entity.id, field_values: { mood: "good" } },
        headers,
      );
      expect(res.status).toBe(400);
    });

    it("rejects invalid metric code", async () => {
      const res = await appPost(
        "/api/v1/observations",
        {
          entity_id: entity.id,
          metric: "nonexistent",
          field_values: { foo: "bar" },
        },
        headers,
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.detail).toContain("metric");
    });

    it("validates required fields", async () => {
      // milestones metric has "name" as required
      const res = await appPost(
        "/api/v1/observations",
        {
          entity_id: entity.id,
          metric: "milestones",
          field_values: { completed: true },
        },
        headers,
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.detail).toContain("required");
    });

    it("allows observation with all required fields present", async () => {
      const res = await appPost(
        "/api/v1/observations",
        {
          entity_id: entity.id,
          metric: "milestones",
          field_values: { name: "v1.0 Release", completed: false },
        },
        headers,
      );
      expect(res.status).toBe(201);
    });

    it("includes notes when provided", async () => {
      const res = await appPost(
        "/api/v1/observations",
        {
          entity_id: entity.id,
          metric: "mood",
          field_values: { mood: "good" },
          notes: "Feeling great today",
        },
        headers,
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.notes).toBe("Feeling great today");
    });
  });

  describe("POST /api/v1/observations/batch", () => {
    it("creates multiple observations in one request", async () => {
      const res = await appPost(
        "/api/v1/observations/batch",
        {
          observations: [
            { entity_id: entity.id, metric: "growth", field_values: { height_cm: 10 } },
            { entity_id: entity.id, metric: "growth", field_values: { height_cm: 15 } },
            { entity_id: entity.id, metric: "growth", field_values: { height_cm: 20 } },
          ],
        },
        headers,
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toHaveLength(3);
    });
  });

  describe("GET /api/v1/observations", () => {
    it("lists observations with pagination", async () => {
      await createObservationForUser(user, {
        entity_id: entity.id,
        metric: "growth",
        field_values: { height_cm: 10 },
      });
      await createObservationForUser(user, {
        entity_id: entity.id,
        metric: "growth",
        field_values: { height_cm: 15 },
      });

      const res = await appGet("/api/v1/observations?page=1&per_page=10", headers);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(2);
      expect(body.count).toBe(2);
    });

    it("filters by entity_id", async () => {
      const entity2 = await createEntityForUser(user, { entity_type: "plant", name: "Basil" });
      await createObservationForUser(user, {
        entity_id: entity.id,
        metric: "growth",
        field_values: { height_cm: 10 },
      });
      await createObservationForUser(user, {
        entity_id: entity2.id,
        metric: "growth",
        field_values: { height_cm: 20 },
      });

      const res = await appGet(`/api/v1/observations?entity_id=${entity.id}`, headers);
      const body = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].entity_id).toBe(entity.id);
    });

    it("filters by metric code", async () => {
      await createObservationForUser(user, {
        entity_id: entity.id,
        metric: "growth",
        field_values: { height_cm: 10 },
      });
      await createObservationForUser(user, {
        entity_id: entity.id,
        metric: "health",
        field_values: { status: "good" },
      });

      const res = await appGet("/api/v1/observations?metric=growth", headers);
      const body = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].field_values.height_cm).toBe(10);
    });

    it("filters by time range (from/to)", async () => {
      await createObservationForUser(user, {
        entity_id: entity.id,
        metric: "growth",
        field_values: { height_cm: 10 },
        observed_at: "2026-01-01T00:00:00Z",
      });
      await createObservationForUser(user, {
        entity_id: entity.id,
        metric: "growth",
        field_values: { height_cm: 20 },
        observed_at: "2026-02-15T00:00:00Z",
      });

      const res = await appGet(
        "/api/v1/observations?from=2026-02-01T00:00:00Z&to=2026-03-01T00:00:00Z",
        headers,
      );
      const body = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].field_values.height_cm).toBe(20);
    });
  });

  describe("GET /api/v1/observations/:id", () => {
    it("returns observation with joined entity and metric", async () => {
      const obs = await createObservationForUser(user, {
        entity_id: entity.id,
        metric: "growth",
        field_values: { height_cm: 45 },
      });

      const res = await appGet(`/api/v1/observations/${obs.id}`, headers);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.entity).toBeDefined();
      expect(body.entity.name).toBe("Tomato");
      expect(body.metric).toBeDefined();
      expect(body.metric.code).toBe("growth");
    });
  });

  describe("DELETE /api/v1/observations/:id", () => {
    it("deletes own observation, returns 204", async () => {
      const obs = await createObservationForUser(user, {
        entity_id: entity.id,
        metric: "mood",
        field_values: { mood: "neutral" },
      });

      const res = await appDelete(`/api/v1/observations/${obs.id}`, headers);
      expect(res.status).toBe(204);
    });
  });
});
