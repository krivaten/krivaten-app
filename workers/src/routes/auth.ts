import { Hono } from "hono";

import { authMiddleware, getUser } from "../middleware/auth";

const auth = new Hono<{ Bindings: Env; Variables: Variables }>();

auth.use("*", authMiddleware);

auth.get("/api/auth/me", (c) => {
  const user = getUser(c);
  return c.json({ user, message: "Successfully authenticated" });
});

export default auth;
