import { Hono } from "hono";
import type { Env, Variables } from "../types/env.d.ts";
import { authMiddleware } from "../middleware/auth";

const entities = new Hono<{ Bindings: Env; Variables: Variables }>();
entities.use("*", authMiddleware);

// Placeholder — will be fully rewritten in Task 10

export default entities;
