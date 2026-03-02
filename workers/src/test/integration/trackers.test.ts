import { describe, it, expect, beforeEach } from "vitest";
import { appGet, appPost, appPut, appDelete } from "../helpers/request";
import { authHeaders } from "../helpers/auth";
import { cleanupAllData } from "../helpers/cleanup";
import {
  setupUserWithTenant,
  getTrackerId,
  getEntityTypeId,
  createEntityForUser,
  createObservationForUser,
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
    it("returns all system trackers", async () => {
      const res = await appGet("/api/v1/trackers", headers);
      expect(res.status).toBe(200);
      const body: Array<{ is_system: boolean }> = await res.json();
      const systemTrackers = body.filter(t => t.is_system);
      expect(systemTrackers).toHaveLength(18);
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

  describe("POST /api/v1/trackers", () => {
    it("creates a custom tracker with fields", async () => {
      const res = await appPost("/api/v1/trackers", {
        name: "Custom Tracker",
        code: "custom_tracker",
        description: "A test tracker",
        fields: [
          { code: "score", name: "Score", field_type: "number", is_required: true, position: 0 },
          { code: "notes", name: "Notes", field_type: "textarea", is_required: false, position: 1 },
        ],
      }, headers);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.code).toBe("custom_tracker");
      expect(body.name).toBe("Custom Tracker");
      expect(body.is_system).toBe(false);
      expect(body.tenant_id).toBeTruthy();
      expect(body.fields).toHaveLength(2);
    });

    it("auto-generates code from name if code not provided", async () => {
      const res = await appPost("/api/v1/trackers", {
        name: "My New Tracker",
        fields: [],
      }, headers);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.code).toBe("my_new_tracker");
    });

    it("returns 400 when name is missing", async () => {
      const res = await appPost("/api/v1/trackers", { fields: [] }, headers);
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid field_type", async () => {
      const res = await appPost("/api/v1/trackers", {
        name: "Bad Tracker",
        fields: [{ code: "f", name: "F", field_type: "invalid", is_required: false, position: 0 }],
      }, headers);
      expect(res.status).toBe(400);
    });

    it("returns 401 without auth", async () => {
      const res = await appPost("/api/v1/trackers", { name: "No Auth", fields: [] });
      expect(res.status).toBe(401);
    });
  });

  describe("PUT /api/v1/trackers/:id", () => {
    it("updates a custom tracker", async () => {
      // Create first
      const createRes = await appPost("/api/v1/trackers", {
        name: "To Update", fields: [{ code: "f1", name: "F1", field_type: "text", is_required: false, position: 0 }],
      }, headers);
      const created = await createRes.json();

      const res = await appPut(`/api/v1/trackers/${created.id}`, {
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

    it("blocks editing system trackers", async () => {
      const moodId = await getTrackerId(user, "mood");
      const res = await appPut(`/api/v1/trackers/${moodId}`, { name: "Hacked" }, headers);
      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /api/v1/trackers/:id", () => {
    it("deletes a custom tracker with no observations", async () => {
      const createRes = await appPost("/api/v1/trackers", { name: "To Delete", fields: [] }, headers);
      const created = await createRes.json();
      const res = await appDelete(`/api/v1/trackers/${created.id}`, headers);
      expect(res.status).toBe(204);
    });

    it("returns 409 when tracker has observations", async () => {
      const createRes = await appPost("/api/v1/trackers", {
        name: "Has Obs",
        fields: [{ code: "val", name: "Val", field_type: "text", is_required: false, position: 0 }],
      }, headers);
      const tracker = await createRes.json();
      const personTypeId = await getEntityTypeId(user, "person");
      const entity = await createEntityForUser(user, { entity_type_id: personTypeId, name: "Test Person" });
      await createObservationForUser(user, { entity_id: entity.id, tracker_id: tracker.id, field_values: { val: "test" } });

      const res = await appDelete(`/api/v1/trackers/${tracker.id}`, headers);
      expect(res.status).toBe(409);
    });

    it("blocks deleting system trackers", async () => {
      const moodId = await getTrackerId(user, "mood");
      const res = await appDelete(`/api/v1/trackers/${moodId}`, headers);
      expect(res.status).toBe(403);
    });
  });

  describe("Entity Type Tracker Associations", () => {
    describe("GET /api/v1/entity-type-trackers", () => {
      it("returns associations for an entity type", async () => {
        const personTypeId = await getEntityTypeId(user, "person");
        const res = await appGet(`/api/v1/entity-type-trackers?entity_type_id=${personTypeId}`, headers);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.length).toBeGreaterThanOrEqual(5); // system defaults
        expect(body[0]).toHaveProperty("tracker");
        expect(body[0]).toHaveProperty("is_system_default");
      });

      it("returns 400 without entity_type_id", async () => {
        const res = await appGet("/api/v1/entity-type-trackers", headers);
        expect(res.status).toBe(400);
      });
    });

    describe("PUT /api/v1/entity-type-trackers", () => {
      it("adds a custom tracker as entity type default", async () => {
        const personTypeId = await getEntityTypeId(user, "person");
        // Create custom tracker first
        const createRes = await appPost("/api/v1/trackers", { name: "Custom Default", fields: [] }, headers);
        const tracker = await createRes.json();

        const res = await appPut("/api/v1/entity-type-trackers", {
          entity_type_id: personTypeId,
          trackers: [{ tracker_id: tracker.id, position: 0 }],
        }, headers);
        expect(res.status).toBe(200);

        // Verify it shows up in GET
        const getRes = await appGet(`/api/v1/entity-type-trackers?entity_type_id=${personTypeId}`, headers);
        const associations = await getRes.json();
        const found = associations.find((a: { tracker: { id: string } }) => a.tracker.id === tracker.id);
        expect(found).toBeDefined();
      });
    });
  });
});
