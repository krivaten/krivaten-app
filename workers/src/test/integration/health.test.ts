import { describe, it, expect } from "vitest";
import { appGet } from "../helpers/request";

describe("Health Routes", () => {
  it("GET / returns 200 with welcome message", async () => {
    const res = await appGet("/");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe("Welcome to Sondering API");
  });

  it("GET /api/health returns 200", async () => {
    const res = await appGet("/api/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("healthy");
  });
});
