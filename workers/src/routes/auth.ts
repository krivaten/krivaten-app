import { Hono } from "hono";
import type { Env, Variables } from "../types/env.d.ts";
import { authMiddleware, getUser } from "../middleware/auth.ts";

const auth = new Hono<{ Bindings: Env; Variables: Variables }>();

auth.use("*", authMiddleware);

auth.get("/api/auth/me", (c) => {
  const user = getUser(c);
  return c.json({ user, message: "Successfully authenticated" });
});

export default auth;
