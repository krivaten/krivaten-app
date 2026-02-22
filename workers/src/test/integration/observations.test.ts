import { describe, it, expect, beforeEach } from "vitest";
import { appGet, appPost, appDelete } from "../helpers/request";
import { authHeaders } from "../helpers/auth";
import { cleanupAllData } from "../helpers/cleanup";
import {
  setupUserWithTenant,
  getSystemVocabId,
  createEntityForUser,
  createObservationForUser,
  type TestUser,
} from "../helpers/fixtures";

describe("Observations Routes", () => {
  let user: TestUser;
  let headers: Record<string, string>;
  let entity: Entity;

  beforeEach(async () => {
    await cleanupAllData();
    const setup = await setupUserWithTenant("obs");
    user = setup.user;
    headers = authHeaders(user.accessToken);
    entity = await createEntityForUser(user, { entity_type: "plant", name: "Tomato" });
  });

  describe("POST /api/v1/observations", () => {
    it("creates observation with variable_id and value_numeric", async () => {
      const varId = await getSystemVocabId(user, "variable", "temperature");
      const unitId = await getSystemVocabId(user, "unit", "celsius");

      const res = await appPost(
        "/api/v1/observations",
        {
          subject_id: entity.id,
          variable_id: varId,
          value_numeric: 22.5,
          unit_id: unitId,
        },
        headers,
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.subject_id).toBe(entity.id);
      expect(body.value_numeric).toBe(22.5);
      expect(body.observer_id).toBe(user.id);
    });

    it("creates observation with value_text (no value_numeric)", async () => {
      const varId = await getSystemVocabId(user, "variable", "note");

      const res = await appPost(
        "/api/v1/observations",
        {
          subject_id: entity.id,
          variable_id: varId,
          value_text: "Leaves looking healthy",
        },
        headers,
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.value_text).toBe("Leaves looking healthy");
      expect(body.value_numeric).toBeNull();
    });

    it("creates observation with variable code lookup", async () => {
      const res = await appPost(
        "/api/v1/observations",
        {
          subject_id: entity.id,
          variable: "humidity",
          value_numeric: 65,
        },
        headers,
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.variable_id).toBeDefined();
    });
  });

  describe("POST /api/v1/observations/batch", () => {
    it("creates multiple observations in one request", async () => {
      const varId = await getSystemVocabId(user, "variable", "temperature");

      const res = await appPost(
        "/api/v1/observations/batch",
        {
          observations: [
            { subject_id: entity.id, variable_id: varId, value_numeric: 20 },
            { subject_id: entity.id, variable_id: varId, value_numeric: 21 },
            { subject_id: entity.id, variable_id: varId, value_numeric: 22 },
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
      const varId = await getSystemVocabId(user, "variable", "temperature");
      await createObservationForUser(user, { subject_id: entity.id, variable_id: varId, value_numeric: 20 });
      await createObservationForUser(user, { subject_id: entity.id, variable_id: varId, value_numeric: 21 });

      const res = await appGet("/api/v1/observations?page=1&per_page=10", headers);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(2);
      expect(body.count).toBe(2);
    });

    it("filters by subject_id", async () => {
      const entity2 = await createEntityForUser(user, { entity_type: "plant", name: "Basil" });
      const varId = await getSystemVocabId(user, "variable", "temperature");
      await createObservationForUser(user, { subject_id: entity.id, variable_id: varId, value_numeric: 20 });
      await createObservationForUser(user, { subject_id: entity2.id, variable_id: varId, value_numeric: 21 });

      const res = await appGet(`/api/v1/observations?subject_id=${entity.id}`, headers);
      const body = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].subject_id).toBe(entity.id);
    });

    it("filters by variable code", async () => {
      const tempId = await getSystemVocabId(user, "variable", "temperature");
      const noteId = await getSystemVocabId(user, "variable", "note");
      await createObservationForUser(user, { subject_id: entity.id, variable_id: tempId, value_numeric: 20 });
      await createObservationForUser(user, { subject_id: entity.id, variable_id: noteId, value_text: "A note" });

      const res = await appGet("/api/v1/observations?variable=temperature", headers);
      const body = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].value_numeric).toBe(20);
    });

    it("filters by time range (from/to)", async () => {
      const varId = await getSystemVocabId(user, "variable", "temperature");
      await createObservationForUser(user, {
        subject_id: entity.id,
        variable_id: varId,
        value_numeric: 18,
        observed_at: "2026-01-01T00:00:00Z",
      });
      await createObservationForUser(user, {
        subject_id: entity.id,
        variable_id: varId,
        value_numeric: 22,
        observed_at: "2026-02-15T00:00:00Z",
      });

      const res = await appGet(
        "/api/v1/observations?from=2026-02-01T00:00:00Z&to=2026-03-01T00:00:00Z",
        headers,
      );
      const body = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].value_numeric).toBe(22);
    });
  });

  describe("GET /api/v1/observations/:id", () => {
    it("returns observation with joined subject, variable, unit", async () => {
      const varId = await getSystemVocabId(user, "variable", "temperature");
      const unitId = await getSystemVocabId(user, "unit", "celsius");
      const obs = await createObservationForUser(user, {
        subject_id: entity.id,
        variable_id: varId,
        value_numeric: 22.5,
        unit_id: unitId,
      });

      const res = await appGet(`/api/v1/observations/${obs.id}`, headers);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.subject).toBeDefined();
      expect(body.subject.name).toBe("Tomato");
      expect(body.variable).toBeDefined();
      expect(body.variable.code).toBe("temperature");
      expect(body.unit).toBeDefined();
      expect(body.unit.code).toBe("celsius");
    });
  });

  describe("DELETE /api/v1/observations/:id", () => {
    it("deletes own observation, returns 204", async () => {
      const varId = await getSystemVocabId(user, "variable", "note");
      const obs = await createObservationForUser(user, {
        subject_id: entity.id,
        variable_id: varId,
        value_text: "To delete",
      });

      const res = await appDelete(`/api/v1/observations/${obs.id}`, headers);
      expect(res.status).toBe(204);
    });
  });
});
