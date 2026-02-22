import { Hono } from "hono";

const health = new Hono<{ Bindings: Env }>();

health.get("/api/v1/health", (c) => {
  return c.json({ status: "healthy" });
});

export default health;
