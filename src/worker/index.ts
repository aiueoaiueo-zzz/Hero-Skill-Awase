import { Hono } from "hono";
import { runMaintenance } from "./cron";
import type { AppEnv, Env } from "./env";
import { requireAdmin } from "./lib/admin-auth";
import { appRole, isAdminPath } from "./lib/role";
import { adminRoutes } from "./routes/admin";
import { contactRoutes } from "./routes/contact";
import { mediaRoutes } from "./routes/media";
import { publicRoutes, shortLinkRoutes } from "./routes/public";
import { submitRoutes } from "./routes/submit";

const app = new Hono<AppEnv>();

// セキュリティ用のヘッダー（ほかのサイトに埋め込ませない・ファイルの種類を推測させない など）。
// Worker を通らない静的ファイルには public/_headers で同じものを付ける
const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy": "frame-ancestors 'none'",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};
app.use("*", async (c, next) => {
  await next();
  // fetch() や ASSETS から受け取ったレスポンスはヘッダーを書き換えられないので、作り直してから付ける
  const res = new Response(c.res.body, c.res);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) if (!res.headers.has(k)) res.headers.set(k, v);
  // 確認用サイトは検索エンジンに載せない
  if (c.env.SITE_STAGE === "staging") res.headers.set("X-Robots-Tag", "noindex, nofollow");
  c.res = res;
});

// 役割ごとの入口の制限
app.use("*", async (c, next) => {
  const role = appRole(c.env);
  const p = c.req.path;
  // 一般向けの Worker には管理画面・管理 API を置かない
  if (role === "public" && isAdminPath(p)) return p.startsWith("/api/") ? c.json({ error: "not_found" }, 404) : c.text("Not Found", 404);
  // 管理用の Worker はトップを開いたら管理画面へ
  if (role === "admin" && p === "/") return c.redirect("/admin", 302);
  return next();
});

app.get("/api/health", async (c) => {
  const row = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM heroes").first<{ n: number }>();
  return c.json({ ok: true, heroes: row?.n ?? 0 });
});
app.route("/api", publicRoutes);
app.route("/api", submitRoutes);
app.route("/api", contactRoutes);
app.route("/api/admin", adminRoutes);

// 管理画面の HTML も Worker で JWT を確認してから返す（Cloudflare Access と二重に確認）
app.on(["GET", "HEAD"], ["/admin", "/admin/*"], requireAdmin("page"), (c) => c.env.ASSETS.fetch(new Request(new URL("/", c.req.url), c.req.raw)));
app.route("/media", mediaRoutes);
app.route("/s", shortLinkRoutes);

app.notFound((c) => (c.req.path.startsWith("/api/") ? c.json({ error: "not_found" }, 404) : c.env.ASSETS.fetch(c.req.raw)));

export default {
  fetch: app.fetch,
  // 1 日 1 回（wrangler.jsonc の triggers.crons）
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    if (appRole(env) === "admin") return; // 自動処理は一般向けの Worker だけで行う
    ctx.waitUntil(runMaintenance(env, controller.scheduledTime).then((r) => console.log("maintenance", JSON.stringify({ ...r, deleted: r.deleted.length }))));
  },
} satisfies ExportedHandler<Env>;
