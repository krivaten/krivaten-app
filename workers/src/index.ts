import { Hono } from "hono";
import { cors } from "hono/cors";

import health from "./routes/health";
import auth from "./routes/auth";
import profiles from "./routes/profiles";
import tenants from "./routes/tenants";
import vocabularies from "./routes/vocabularies";
import entities from "./routes/entities";
import edges from "./routes/edges";
import observations from "./routes/observations";
import search from "./routes/search";

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
  return c.json({ message: "Welcome to Krivaten API" });
});

app.route("/", health);
app.route("/", auth);
app.route("/", profiles);
app.route("/", tenants);
app.route("/", vocabularies);
app.route("/", entities);
app.route("/", edges);
app.route("/", observations);
app.route("/", search);

export default app;
