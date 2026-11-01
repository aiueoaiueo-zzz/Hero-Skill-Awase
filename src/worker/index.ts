import { Hono } from "hono";
import type { AppEnv } from "./env";

const app = new Hono<AppEnv>();

app.get("/api/health", async (c) => {
  const row = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM heroes").first<{ n: number }>();
  return c.json({ ok: true, heroes: row?.n ?? 0 });
});

app.get("/api/heroes", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, name, slug, image_key, sort_order FROM heroes ORDER BY sort_order, created_at",
  ).all();
  return c.json({ heroes: results });
});

app.notFound((c) => (c.req.path.startsWith("/api/") ? c.json({ error: "not_found" }, 404) : c.env.ASSETS.fetch(c.req.raw)));

export default app;
