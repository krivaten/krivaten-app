import { Hono } from "hono";


const health = new Hono<{ Bindings: Env }>();

health.get("/api/health", (c) => {
  return c.json({ status: "healthy" });
});

export default health;
