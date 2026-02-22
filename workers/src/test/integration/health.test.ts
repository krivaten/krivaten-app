import { describe, it, expect } from "vitest";
import { appGet } from "../helpers/request";

describe("Health Routes", () => {
  it("GET / returns 200 with welcome message", async () => {
    const res = await appGet("/");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe("Welcome to Krivaten API");
  });

  it("GET /api/v1/health returns 200", async () => {
    const res = await appGet("/api/v1/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("healthy");
  });
});
