import { Hono } from "hono";
import { cors } from "hono/cors";

import health from "./routes/health";
import auth from "./routes/auth";
import profiles from "./routes/profiles";
import households from "./routes/households";
import entities from "./routes/entities";
import observations from "./routes/observations";
import relationships from "./routes/relationships";
import exportRoutes from "./routes/export";

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
