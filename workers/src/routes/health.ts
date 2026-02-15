import { Hono } from "hono";
import type { Env } from "../types/env.d.ts";

const health = new Hono<{ Bindings: Env }>();

health.get("/api/health", (c) => {
  return c.json({ status: "healthy" });
});

export default health;
