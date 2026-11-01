import { Hono } from "hono";
import type { AppEnv } from "./env";
import { requireAdmin } from "./lib/admin-auth";
import { adminRoutes } from "./routes/admin";
import { mediaRoutes } from "./routes/media";
import { publicRoutes } from "./routes/public";
import { submitRoutes } from "./routes/submit";

const app = new Hono<AppEnv>();

app.get("/api/health", async (c) => {
  const row = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM heroes").first<{ n: number }>();
  return c.json({ ok: true, heroes: row?.n ?? 0 });
});
app.route("/api", publicRoutes);
app.route("/api", submitRoutes);
app.route("/api/admin", adminRoutes);

// 管理画面の HTML も Worker で JWT を確認してから返す（Cloudflare Access と二重に確認）
app.on(["GET", "HEAD"], ["/admin", "/admin/*"], requireAdmin("page"), (c) => c.env.ASSETS.fetch(new Request(new URL("/", c.req.url), c.req.raw)));
app.route("/media", mediaRoutes);

app.notFound((c) => (c.req.path.startsWith("/api/") ? c.json({ error: "not_found" }, 404) : c.env.ASSETS.fetch(c.req.raw)));

export default app;
