import { Hono } from "hono";
import type { Env, Variables } from "../types/env.d.ts";
import { authMiddleware } from "../middleware/auth";

const observations = new Hono<{ Bindings: Env; Variables: Variables }>();
observations.use("*", authMiddleware);

// Placeholder — will be fully rewritten in Task 12

export default observations;
