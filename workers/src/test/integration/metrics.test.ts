import { describe, it, expect, beforeEach } from "vitest";
import { appGet, appPost, appPut, appDelete } from "../helpers/request";
import { authHeaders } from "../helpers/auth";
import { cleanupAllData } from "../helpers/cleanup";
import {
  setupUserWithTenant,
  getMetricId,
  getEntityTypeId,
  createEntityForUser,
  createObservationForUser,
  type TestUser,
} from "../helpers/fixtures";

describe("Metrics Routes", () => {
  let user: TestUser;
  let headers: Record<string, string>;

  beforeEach(async () => {
    await cleanupAllData();
    const setup = await setupUserWithTenant("metric");
    user = setup.user;
    headers = authHeaders(user.accessToken);
  });

  describe("GET /api/v1/metrics", () => {
    it("returns all system metrics", async () => {
      const res = await appGet("/api/v1/metrics", headers);
      expect(res.status).toBe(200);
      const body: Array<{ is_system: boolean }> = await res.json();
      const systemMetrics = body.filter(t => t.is_system);
      expect(systemMetrics).toHaveLength(18);
    });

    it("returns metrics with fields included", async () => {
      const res = await appGet("/api/v1/metrics", headers);
      const body: Array<{ code: string; fields: unknown[] }> = await res.json();
      const mood = body.find((t) => t.code === "mood");
      expect(mood).toBeDefined();
      expect(mood!.fields.length).toBeGreaterThan(0);
    });

    it("filters by entity_type=person returns 5 metrics", async () => {
      const res = await appGet("/api/v1/metrics?entity_type=person", headers);
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
      const res = await appGet("/api/v1/metrics?entity_type=nonexistent", headers);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(0);
    });

    it("returns 401 without auth", async () => {
      const res = await appGet("/api/v1/metrics");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/v1/metrics/:id", () => {
    it("returns single metric with fields", async () => {
      const moodId = await getMetricId(user, "mood");
      const res = await appGet(`/api/v1/metrics/${moodId}`, headers);
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
        "/api/v1/metrics/00000000-0000-0000-0000-000000000000",
        headers,
      );
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/v1/metrics", () => {
    it("creates a custom metric with fields", async () => {
      const res = await appPost("/api/v1/metrics", {
        name: "Custom Metric",
        code: "custom_metric",
        description: "A test metric",
        fields: [
          { code: "score", name: "Score", field_type: "number", is_required: true, position: 0 },
          { code: "notes", name: "Notes", field_type: "textarea", is_required: false, position: 1 },
        ],
      }, headers);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.code).toBe("custom_metric");
      expect(body.name).toBe("Custom Metric");
      expect(body.is_system).toBe(false);
      expect(body.tenant_id).toBeTruthy();
      expect(body.fields).toHaveLength(2);
    });

    it("auto-generates code from name if code not provided", async () => {
      const res = await appPost("/api/v1/metrics", {
        name: "My New Metric",
        fields: [],
      }, headers);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.code).toBe("my_new_metric");
    });

    it("returns 400 when name is missing", async () => {
      const res = await appPost("/api/v1/metrics", { fields: [] }, headers);
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid field_type", async () => {
      const res = await appPost("/api/v1/metrics", {
        name: "Bad Metric",
        fields: [{ code: "f", name: "F", field_type: "invalid", is_required: false, position: 0 }],
      }, headers);
      expect(res.status).toBe(400);
    });

    it("returns 401 without auth", async () => {
      const res = await appPost("/api/v1/metrics", { name: "No Auth", fields: [] });
      expect(res.status).toBe(401);
    });
  });

  describe("PUT /api/v1/metrics/:id", () => {
    it("updates a custom metric", async () => {
      // Create first
      const createRes = await appPost("/api/v1/metrics", {
        name: "To Update", fields: [{ code: "f1", name: "F1", field_type: "text", is_required: false, position: 0 }],
      }, headers);
      const created = await createRes.json();

      const res = await appPut(`/api/v1/metrics/${created.id}`, {
        name: "Updated Name",
        description: "New desc",
        fields: [
          { id: created.fields[0].id, code: "f1", name: "Field One", field_type: "text", is_required: true, position: 0 },
          { code: "f2", name: "Field Two", field_type: "number", is_required: false, position: 1 },
        ],
      }, headers);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.name).toBe("Updated Name");
      expect(body.fields).toHaveLength(2);
    });

    it("blocks editing system metrics", async () => {
      const moodId = await getMetricId(user, "mood");
      const res = await appPut(`/api/v1/metrics/${moodId}`, { name: "Hacked" }, headers);
      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /api/v1/metrics/:id", () => {
    it("deletes a custom metric with no observations", async () => {
      const createRes = await appPost("/api/v1/metrics", { name: "To Delete", fields: [] }, headers);
      const created = await createRes.json();
      const res = await appDelete(`/api/v1/metrics/${created.id}`, headers);
      expect(res.status).toBe(204);
    });

    it("returns 409 when metric has observations", async () => {
      const createRes = await appPost("/api/v1/metrics", {
        name: "Has Obs",
        fields: [{ code: "val", name: "Val", field_type: "text", is_required: false, position: 0 }],
      }, headers);
      const metric = await createRes.json();
      const personTypeId = await getEntityTypeId(user, "person");
      const entity = await createEntityForUser(user, { entity_type_id: personTypeId, name: "Test Person" });
      await createObservationForUser(user, { entity_id: entity.id, metric_id: metric.id, field_values: { val: "test" } });

      const res = await appDelete(`/api/v1/metrics/${metric.id}`, headers);
      expect(res.status).toBe(409);
    });

    it("blocks deleting system metrics", async () => {
      const moodId = await getMetricId(user, "mood");
      const res = await appDelete(`/api/v1/metrics/${moodId}`, headers);
      expect(res.status).toBe(403);
    });
  });

  describe("Entity Type Metric Associations", () => {
    describe("GET /api/v1/entity-type-metrics", () => {
      it("returns associations for an entity type", async () => {
        const personTypeId = await getEntityTypeId(user, "person");
        const res = await appGet(`/api/v1/entity-type-metrics?entity_type_id=${personTypeId}`, headers);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.length).toBeGreaterThanOrEqual(5); // system defaults
        expect(body[0]).toHaveProperty("metric");
        expect(body[0]).toHaveProperty("is_system_default");
      });

      it("returns 400 without entity_type_id", async () => {
        const res = await appGet("/api/v1/entity-type-metrics", headers);
        expect(res.status).toBe(400);
      });
    });

    describe("PUT /api/v1/entity-type-metrics", () => {
      it("adds a custom metric as entity type default", async () => {
        const personTypeId = await getEntityTypeId(user, "person");
        // Create custom metric first
        const createRes = await appPost("/api/v1/metrics", { name: "Custom Default", fields: [] }, headers);
        const metric = await createRes.json();

        const res = await appPut("/api/v1/entity-type-metrics", {
          entity_type_id: personTypeId,
          metrics: [{ metric_id: metric.id, position: 0 }],
        }, headers);
        expect(res.status).toBe(200);

        // Verify it shows up in GET
        const getRes = await appGet(`/api/v1/entity-type-metrics?entity_type_id=${personTypeId}`, headers);
        const associations = await getRes.json();
        const found = associations.find((a: { metric: { id: string } }) => a.metric.id === metric.id);
        expect(found).toBeDefined();
      });
    });
  });
});
