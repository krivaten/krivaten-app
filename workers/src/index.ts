import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types/env.d.ts";
import health from "./routes/health.ts";
import auth from "./routes/auth.ts";
import profiles from "./routes/profiles.ts";
import households from "./routes/households.ts";
import entities from "./routes/entities.ts";
import observations from "./routes/observations.ts";
import relationships from "./routes/relationships.ts";
import exportRoutes from "./routes/export.ts";

const app = new Hono<{ Bindings: Env }>();

app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const frontendUrl = c.env.FRONTEND_URL || "http://localhost:5173";
      if (!origin || origin === frontendUrl) {
        return origin || frontendUrl;
      }
      return null;
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.get("/", (c) => {
  return c.json({ message: "Welcome to Sondering API" });
});

app.route("/", health);
app.route("/", auth);
app.route("/", profiles);
app.route("/", households);
app.route("/", entities);
app.route("/", observations);
app.route("/", relationships);
app.route("/", exportRoutes);

export default app;
