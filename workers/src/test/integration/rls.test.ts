import { describe, it, expect, beforeEach } from "vitest";
import { appGet, appPost } from "../helpers/request";
import { authHeaders } from "../helpers/auth";
import { cleanupAllData } from "../helpers/cleanup";
import {
  setupUserWithTenant,
  createEntityForUser,
  createEdgeForUser,
  createObservationForUser,
  getSystemVocabId,
  type TestUser,
} from "../helpers/fixtures";

describe("RLS Isolation and Regression", () => {
  let userA: TestUser;
  let userB: TestUser;
  let headersA: Record<string, string>;
  let headersB: Record<string, string>;
  let entityA: Entity;

  beforeEach(async () => {
    await cleanupAllData();

    // Set up two users in separate tenants
    const setupA = await setupUserWithTenant("rlsA", "Workspace A");
    userA = setupA.user;
    headersA = authHeaders(userA.accessToken);

    const setupB = await setupUserWithTenant("rlsB", "Workspace B");
    userB = setupB.user;
    headersB = authHeaders(userB.accessToken);

    // Create data for User A
    entityA = await createEntityForUser(userA, {
      entity_type: "person",
      name: "Alice Private",
    });

    const varId = await getSystemVocabId(userA, "variable", "note");
    await createObservationForUser(userA, {
      subject_id: entityA.id,
      variable_id: varId,
      value_text: "Private observation",
    });
  });

  describe("Cross-tenant isolation", () => {
    it("User B cannot see User A's entities", async () => {
      const res = await appGet("/api/v1/entities", headersB);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(0);
    });

    it("User B cannot see User A's edges", async () => {
      const entityA2 = await createEntityForUser(userA, {
        entity_type: "person",
        name: "Alice Friend",
      });
      await createEdgeForUser(userA, {
        source_id: entityA.id,
        target_id: entityA2.id,
        edge_type: "manages",
      });

      const res = await appGet("/api/v1/edges?entity_id=" + entityA.id, headersB);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(0);
    });

    it("User B cannot see User A's observations", async () => {
      const res = await appGet("/api/v1/observations", headersB);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(0);
    });

    it("User B cannot see User A's tenant-specific vocabularies", async () => {
      // Create tenant-specific vocab for User A
      await appPost(
        "/api/v1/vocabularies",
        {
          vocabulary_type: "variable",
          code: "secret_var",
          name: "Secret Variable",
        },
        headersA,
      );

      // User B should only see system vocabs, not A's tenant vocab
      const res = await appGet("/api/v1/vocabularies?type=variable", headersB);
      const body = await res.json();
      const secretVocab = body.find((v: { code: string }) => v.code === "secret_var");
      expect(secretVocab).toBeUndefined();
    });

    it("User B CAN see system vocabularies", async () => {
      const res = await appGet("/api/v1/vocabularies?type=entity_type", headersB);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.length).toBe(8);
      expect(body.every((v: { is_system: boolean }) => v.is_system === true)).toBe(true);
    });

    it("User B's tenant is isolated from User A's", async () => {
      const res = await appGet("/api/v1/tenants/mine", headersB);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.name).toBe("Workspace B");
    });
  });

  describe("RLS regression tests", () => {
    it("GET /api/v1/profiles/me does not cause infinite recursion", async () => {
      const res = await appGet("/api/v1/profiles/me", headersA);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe(userA.id);
    });

    it("entity creation works immediately after tenant creation", async () => {
      await cleanupAllData();
      const setup = await setupUserWithTenant("regression");
      const user = setup.user;
      const headers = authHeaders(user.accessToken);

      const res = await appPost(
        "/api/v1/entities",
        { entity_type: "person", name: "Immediate Entity" },
        headers,
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.name).toBe("Immediate Entity");
    });
  });
});
