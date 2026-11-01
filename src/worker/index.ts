import { Hono } from "hono";
import type { AppEnv } from "./env";
import { mediaRoutes } from "./routes/media";
import { publicRoutes } from "./routes/public";

const app = new Hono<AppEnv>();

app.get("/api/health", async (c) => {
  const row = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM heroes").first<{ n: number }>();
  return c.json({ ok: true, heroes: row?.n ?? 0 });
});
app.route("/api", publicRoutes);
app.route("/media", mediaRoutes);

app.notFound((c) => (c.req.path.startsWith("/api/") ? c.json({ error: "not_found" }, 404) : c.env.ASSETS.fetch(c.req.raw)));

export default app;
